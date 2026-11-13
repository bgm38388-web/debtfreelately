import {getRuntime, resolveOrigin} from '../../runtime.mjs';
import {createRequestHandler} from '../../server.mjs';

export const config = {api: {bodyParser: false, responseLimit: false}, maxDuration: 60};

export default async function handler(req, res) {
  const [route, ...rest] = req.query.route;
  const query = req.url.includes('?') ? '?' + req.url.split('?').slice(1).join('?') : '';
  if (route === '__ads-preview') req.url = '/ads-preview' + query;
  if (route === '__info') req.url = '/' + rest.map(encodeURIComponent).join('/') + query;

  try {
    const host = req.headers.host || '';
    const local = !process.env.VERCEL && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
    const origin = local ? 'http://' + host : resolveOrigin(req);
    const services = await getRuntime();
    await createRequestHandler({...services, origin})(req, res);
  } catch (error) {
    if (res.headersSent) return;
    console.error('API initialization failed:', error.name);
    res.setHeader('Cache-Control', 'no-store');
    res.status(error.status || 503).json({
      error: error.status === 403 ? 'Yêu cầu không hợp lệ.' : 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.',
    });
  }
}
