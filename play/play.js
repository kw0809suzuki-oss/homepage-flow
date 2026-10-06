(() => {
  const status = document.querySelector('[data-play-status]');
  const content = document.querySelector('[data-play-content]');

  const escapeHtml = (s) => String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#39;");

  const decodeBase64UrlUtf8 = (value) => {
    const normalized = value.replace(/-/g,'+').replace(/_/g,'/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder('utf-8', {fatal:true}).decode(bytes);
  };

  const inline = (text) => {
    let s = escapeHtml(text);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return s;
  };

  const renderMarkdown = (source) => {
    const lines = source.replace(/\r\n?/g,'\n').split('\n');
    const out = [];
    let inCode = false;
    let code = [];
    let listOpen = false;

    const closeList = () => {
      if(listOpen){ out.push('</ul>'); listOpen = false; }
    };

    for(const line of lines){
      if(line.trim().startsWith('```')){
        closeList();
        if(inCode){
          out.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
          code = [];
          inCode = false;
        }else{
          inCode = true;
        }
        continue;
      }
      if(inCode){ code.push(line); continue; }

      const heading = line.match(/^(#{1,3})\s+(.*)$/);
      if(heading){
        closeList();
        const level = heading[1].length;
        out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
        continue;
      }

      const bullet = line.match(/^\s*[-*]\s+(.*)$/);
      if(bullet){
        if(!listOpen){ out.push('<ul>'); listOpen = true; }
        out.push('<li>' + inline(bullet[1]) + '</li>');
        continue;
      }

      closeList();

      const quote = line.match(/^>\s?(.*)$/);
      if(quote){
        out.push('<blockquote>' + inline(quote[1]) + '</blockquote>');
        continue;
      }

      if(!line.trim()){
        out.push('');
        continue;
      }

      out.push('<p>' + inline(line) + '</p>');
    }

    closeList();
    if(inCode){
      out.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>');
    }
    return out.join('\n');
  };

  const showBoundary = (message) => {
    status.textContent = 'BOUNDARY';
    content.innerHTML = '<div class="play-boundary">' + escapeHtml(message) + '</div>';
  };

  const render = () => {
    const raw = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
    if(!raw){
      status.textContent = 'WAITING FOR URL FRAGMENT';
      content.innerHTML = '<p class="play-empty">#type=markdown&amp;data=... を受け取ると、ここに展開します。</p>';
      return;
    }

    const params = new URLSearchParams(raw);
    const type = params.get('type');
    const data = params.get('data');

    if(type !== 'markdown'){
      showBoundary('このProbeで対応しているtypeは markdown だけです。');
      return;
    }
    if(!data){
      showBoundary('data がありません。');
      return;
    }

    try{
      const markdown = decodeBase64UrlUtf8(data);
      status.textContent = 'LOCAL RENDER / MARKDOWN / NOT STORED';
      content.innerHTML = renderMarkdown(markdown);
    }catch(e){
      showBoundary('data を UTF-8 Base64URL として読めませんでした。');
    }
  };

  addEventListener('hashchange', render);
  render();
})();
