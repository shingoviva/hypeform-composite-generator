export function instagramLabel(value?: string) {
  const account = (value || '').trim().replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, '').split(/[/?#]/)[0].replace(/^@/, '');
  return account ? `@${account}` : '';
}
