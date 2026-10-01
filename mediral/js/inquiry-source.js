// A fixed, user-visible source label; never copy arbitrary URL values or identifiers.
export function inquirySource(search = '') {
  const params = new URLSearchParams(search);
  return params.get('utm_source') === 'chatgpt'
    && params.get('utm_medium') === 'paid'
    && params.get('utm_campaign') === 'mediral_th_launch'
    ? '\nเห็น Mediral จากโฆษณา ChatGPT' : '';
}
