(() => {
  const PRODUCT = {
    content_name: 'AI ใส่ซอส · First Class',
    content_category: 'Online Course',
    content_ids: ['ai-sauce-first-class-2026-08-18'],
    content_type: 'product',
    value: 98,
    currency: 'THB',
  };
  const PRODUCTION_HOSTS = new Set(['www.myclover.com', 'myclover.com']);
  const pending = [];
  let ready = false;

  const cookie = name => document.cookie.split('; ').find(item => item.startsWith(`${name}=`))?.slice(name.length + 1) || '';
  const clean = (value, max = 500) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
  const attribution = () => {
    const query = new URLSearchParams(location.search);
    const fbclid = clean(query.get('fbclid'), 300);
    const existingFbc = clean(cookie('_fbc'), 500);
    return {
      fbp: clean(cookie('_fbp'), 500),
      fbc: existingFbc || (fbclid ? `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}` : ''),
      utm: Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
        .map(key => [key, clean(query.get(key), 200)]).filter(([, value]) => value)),
      landingReferrer: clean(document.referrer, 1000),
    };
  };

  function send(eventName, parameters, eventId) {
    if (!ready) return pending.push([eventName, parameters, eventId]);
    window.fbq('track', eventName, parameters, eventId ? { eventID: eventId } : undefined);
  }

  window.firstClassMeta = {
    attribution,
    trackLead(reference) {
      if (reference) send('Lead', PRODUCT, `lead-${clean(reference, 40)}`);
    },
  };

  if (!PRODUCTION_HOSTS.has(location.hostname)) return;
  fetch('/api/first-class?public=meta', { headers: { accept: 'application/json' } })
    .then(response => response.ok ? response.json() : null)
    .then(config => {
      if (!config?.enabled || !/^\d{5,30}$/.test(String(config.pixelId || ''))) return;
      if (!window.fbq) {
        const fbq = window.fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
        if (!window._fbq) window._fbq = fbq;
        fbq.push = fbq;
        fbq.loaded = true;
        fbq.version = '2.0';
        fbq.queue = [];
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://connect.facebook.net/en_US/fbevents.js';
        document.head.appendChild(script);
      }
      window.fbq('init', String(config.pixelId));
      ready = true;
      window.fbq('track', 'PageView');
      window.fbq('track', 'ViewContent', PRODUCT);
      pending.splice(0).forEach(([name, params, id]) => send(name, params, id));
    })
    .catch(() => { /* Tracking must never block registration. */ });
})();
