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

export default function MjpegProxy(mjpegUrl: string) {
    const mjpegOptions = new URL(mjpegUrl)

    let audienceResponses: WritableStreamDefaultWriter[] = []

    let boundary: string | null = null
    let globalMjpegResponse: IncomingMessage | null = null

    const _newClient = async (resStream: TransformStream, resolve: (value: any) => void) => {
        const writer = resStream.writable.getWriter()
        await writer.ready
        audienceResponses.push(writer)

        const res = new Response(resStream.readable, {
            status: 200,
            headers: {
                'Expires': 'Mon, 01 Jul 1980 00:00:00 GMT',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Content-Type': 'multipart/x-mixed-replace;boundary=' + boundary,
                'Content-Disposition': 'inline; filename="Webcam-live-Air-Alpin"',
                'X-Robots-Tag': 'noindex'
            }
        });
        resolve(res)
    }

    const _removeClient = (writer: WritableStreamDefaultWriter) => {
        audienceResponses.splice(audienceResponses.indexOf(writer), 1);

        if (audienceResponses.length == 0) {
            if (globalMjpegResponse) {
                globalMjpegResponse.destroy()
                globalMjpegResponse = null
            }
        }
    }

    return {
        proxyRequest: () => {
            return new Promise((resolve) => {
                const resStream = new TransformStream()
                // There is already another client consuming the MJPEG response
                if (globalMjpegResponse) {
                    _newClient(resStream, resolve)
                } else {
                    // Send source MJPEG request
                    request(mjpegOptions, (mjpegResponse) => {
                        globalMjpegResponse = mjpegResponse
                        boundary = extractBoundary(mjpegResponse.headers['content-type'])

                        _newClient(resStream, resolve)

                        mjpegResponse.on('data', async (chunk) => {
                            for (const audienceResponse of audienceResponses) {
                                try {
                                    await audienceResponse.write(chunk)
                                } catch (Error) {
                                    // Exception occured : response aborted, remove this client
                                    _removeClient(audienceResponse)
                                }
                            }
                        })
                        const end = () => {
                            audienceResponses.forEach(audienceResponse => {
                                audienceResponse.close()
                            })
                            audienceResponses = []
                        }
                        mjpegResponse.on('end', end)
                        mjpegResponse.on('close', end)
                    }).end()
                }
            })
        }
    }
}
