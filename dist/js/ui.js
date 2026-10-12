export function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function externalLink(label, url, className = '') {
  const target = new URL(url);
  if (target.protocol !== 'https:' || target.username || target.password) throw new Error('Güvenli HTTPS bağlantısı gerekli.');
  const link = node('a', className, label);
  link.href = target.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

export function downloadFile(filename, text, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function emptyState(title, text) {
  const div = node('div','empty-state');
  div.append(node('strong','',title), node('span','',text));
  return div;
}
