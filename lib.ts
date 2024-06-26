import { IncomingMessage, request } from 'http';

function extractBoundary(contentType?: string) {
    if (!contentType) return null
    contentType = contentType.replace(/\s+/g, '')

    const startIndex = contentType.indexOf('boundary=')
    let endIndex = contentType.indexOf(';', startIndex)
    if (endIndex == -1) { //boundary is the last option
        // some servers, like mjpeg-streamer puts a '\r' character at the end of each line.
        if ((endIndex = contentType.indexOf('\r', startIndex)) == -1) {
            endIndex = contentType.length
        }
    }
    return contentType.substring(startIndex + 9, endIndex).replace(/"/gi, '').replace(/^--/gi, '');
}

export default class MjpegProxy {
    mjpegOptions: URL
    audienceResponses: WritableStreamDefaultWriter[] = []
    boundary: string | null = null
    globalMjpegResponse: IncomingMessage | null = null

    constructor(mjpegUrl: string) {
        this.mjpegOptions = new URL(mjpegUrl)
    }

    async _newClient(resStream: TransformStream, resolve: (value: any) => void, customHeaders: HeadersInit = {}) {
        const writer = resStream.writable.getWriter()
        await writer.ready
        this.audienceResponses.push(writer)

        const res = new Response(resStream.readable, {
            status: 200,
            headers: {
                'Expires': 'Mon, 01 Jul 1980 00:00:00 GMT',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Content-Type': 'multipart/x-mixed-replace;boundary=' + this.boundary,
                ...customHeaders
            }
        });
        resolve(res)
    }

    async _removeClient(writer: WritableStreamDefaultWriter) {
        this.audienceResponses.splice(this.audienceResponses.indexOf(writer), 1);

        if (this.audienceResponses.length == 0) {
            if (this.globalMjpegResponse) {
                this.globalMjpegResponse.destroy()
                this.globalMjpegResponse = null
            }
        }
    }


    proxyRequest(customHeaders: HeadersInit = {}): Promise<Response> {
        return new Promise((resolve) => {
            const resStream = new TransformStream()
            // There is already another client consuming the MJPEG response
            if (this.globalMjpegResponse) {
                this._newClient(resStream, resolve, customHeaders)
            } else {
                // Send source MJPEG request
                request(this.mjpegOptions, (mjpegResponse) => {
                    this.globalMjpegResponse = mjpegResponse
                    this.boundary = extractBoundary(mjpegResponse.headers['content-type'])

                    this._newClient(resStream, resolve, customHeaders)

                    mjpegResponse.on('data', (chunk) => {
                        for (const audienceResponse of this.audienceResponses) {
                            audienceResponse.write(chunk).catch(() => {
                                // Exception occured : response aborted, remove this client
                                this._removeClient(audienceResponse)
                            })
                        }
                    })
                    const end = () => {
                        this.audienceResponses.forEach(audienceResponse => {
                            audienceResponse.close()
                        })
                        this.audienceResponses = []
                    }
                    mjpegResponse.on('end', end)
                    mjpegResponse.on('close', end)
                }).end()
            }
        })
    }
}
