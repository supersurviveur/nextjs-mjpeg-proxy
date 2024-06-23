# Nextjs mjpeg proxy

A node.js module to proxy MJPEG requests. Supports multiple client consuming a single stream. Use web [`Response`](https://developer.mozilla.org/en/docs/Web/API/Response) object.

## Installation

From npm :
```bash
npm install nextjs-mjpeg-proxy
```

## Example

### Example Usage

You can use the proxy in the new [Nextjs app router](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
```ts
import MjpegProxy from 'nextjs-mjpeg-proxy'

const webcamURL = `http://${process.env.NEXT_PUBLIC_WEBCAM_IP}/mjpg/video.mjpg`

const { proxyRequest } = MjpegProxy(webcamURL)

export async function GET() {
    return proxyRequest()
}
```

## API

``` js
const { proxyRequest } = MjpegProxy(mjpegUrl);
``` 

`proxyRequest` is a function returning a web [`Response`](https://developer.mozilla.org/en/docs/Web/API/Response) object.

## Credits

Original prototype version from:
  * Phil Rene ([philrene](http://github.com/philrene))
  * Chris Chua ([chrisirhc](http://github.com/chrisirhc))
  * Georges-Etienne Legendre ([legege](https://github.com/legege))
