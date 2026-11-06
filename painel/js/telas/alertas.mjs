// Alertas (Telegram, notificação no navegador, e-mail), relatório semanal e chave da extensão do Chrome.
import { useState, useLayoutEffect as useEffect } from 'preact/hooks';
import { html, api, post, aviso, copiar, useDados, useLoja, nomePais, relativo, fmt } from '../base.mjs';
import { Ic, Esqueleto, Erro, Tabela, Status } from '../ui.mjs';

const b64 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };

export function PainelAlertas({ config, mudar }) {
  const r = useDados('/api/relatorio');
  const [push, setPush] = useState(window.Notification?.permission === 'granted' ? 'verificando' : 'desligado');
  const a = config.alertas || {};
  useEffect(() => { navigator.serviceWorker?.getRegistration().then((reg) => reg?.pushManager.getSubscription()).then((s) => setPush(s ? 'ligado' : 'desligado')).catch(() => setPush('indisponivel')); }, []);
  const ligar = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return aviso('Notificações funcionam no site publicado (https), não no modo local.');
      if ((await Notification.requestPermission()) !== 'granted') return aviso('Permissão negada no navegador');
      const { chave } = await api('/api/push/chave');
      if (!chave) return aviso('Servidor sem suporte a notificações');
      const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(chave) });
      await post('/api/push/inscrever', { inscricao: s.toJSON() }); setPush('ligado'); aviso('Notificações ligadas neste navegador');
    } catch (e) { aviso('Não foi possível ligar: ' + e.message); }
  };
  const desligar = async () => { const s = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription(); if (s) { await post('/api/push/sair', { endpoint: s.endpoint }); await s.unsubscribe(); } setPush('desligado'); };
  const d = r.dados || {};
  return html`<div class="painel-box"><div class="pb-cab"><h2>Alertas</h2></div><div class="pb-corpo col-gap">
    <div class="form-grade"><label class="campo">Avisar quando um acompanhado subir (%)<input type="number" value=${a.subiuPct ?? 30} onInput=${(e) => mudar({ alertas: { ...a, subiuPct: Number(e.target.value) } })} /></label>
      <label class="campo">Oferta nova forte a partir de (anúncios)<input type="number" value=${a.novaMinimo ?? 20} onInput=${(e) => mudar({ alertas: { ...a, novaMinimo: Number(e.target.value) } })} /></label></div>
    <div class="peq">Telegram: ${d.telegram ? 'ligado' : 'desligado'}. Canal de ofertas do dia: ${d.canal ? 'ligado' : 'desligado'}. E-mail: ${d.email ? 'ligado' : 'desligado'}.</div>
    ${!d.telegram || !d.canal || !d.email ? html`<details class="tecnico"><summary>Como ligar os canais desligados</summary><p class="peq">Telegram: rode <code>configurar-segredos.ps1</code>. Canal de ofertas: defina <code>TELEGRAM_CANAL_ID</code>. E-mail: defina <code>SMTP_USER</code> e <code>SMTP_PASS</code> (senha de app do Gmail).</p></details>` : null}
    <div class="linha">${push === 'ligado' ? html`<button onClick=${desligar}>Desligar notificações neste navegador</button>` : html`<button onClick=${ligar} disabled=${push === 'indisponivel'}>Ligar notificações neste navegador</button>`}
      <button onClick=${async () => { const x = await post('/api/alertas/teste', {}); aviso(`Teste enviado: Telegram ${x.telegram ? 'ok' : 'não'}, navegador ${x.push}`); }}>Enviar alerta de teste</button></div>
    <p class="mut peq" style="margin:0">O robô confere a cada rodada: acompanhados que subiram, criativos novos de quem você acompanha, ofertas novas fortes, robô com erro e banco acima de 80%.</p></div></div>`;
}

export function PainelExtensao() {
  const [chave, setChave] = useState('');
  useEffect(() => { api('/api/extensao-chave').then((r) => setChave(r.chave)).catch(() => {}); }, []);
  return html`<div class="painel-box"><div class="pb-cab"><h2>Extensão do Chrome</h2></div><div class="pb-corpo col-gap">
    <p class="mut peq" style="margin:0">Mostra o número de anúncios de cada anunciante direto na Biblioteca, salva com um clique e abre a análise do site.
      É grátis e se instala uma vez.</p>
    <details class="tecnico"><summary>Como instalar</summary><p class="peq">Baixe a pasta <code>extensao</code> do repositório, abra <code>chrome://extensions</code>, ative o "Modo do desenvolvedor" e clique em "Carregar sem compactação".</p></details>
    <label class="campo">Endereço do painel<input readonly value=${location.origin} onFocus=${(e) => e.target.select()} /></label>
    <label class="campo">Sua chave (cole nas opções da extensão)<input readonly value=${chave} onFocus=${(e) => e.target.select()} /></label>
    <div class="linha"><button onClick=${() => copiar(chave)}><${Ic} n="copiar" /> Copiar chave</button>
      <button class="fantasma" onClick=${async () => { const r = await post('/api/extensao-chave', {}); setChave(r.chave); aviso('Chave nova gerada: atualize na extensão'); }}>Gerar nova chave</button></div></div></div>`;
}

export function TelaRelatorio() {
  const l = useLoja();
  const r = useDados('/api/relatorio');
  if (r.erro) return html`<${Erro} msg=${r.erro} />`;
  if (r.carregando) return html`<${Esqueleto} linhas=${10} />`;
  const d = r.dados;
  const tab = (titulo, lista, vazio) => html`<div class="painel-box"><div class="pb-cab"><h2>${titulo}</h2><span class="mut peq">${lista.length}</span></div>
    ${lista.length ? html`<${Tabela} linhas=${lista} colunas=${[{ t: 'Anunciante', v: (p) => html`<a href=${'/oferta/' + p.page_id}>${p.nome}</a>` }, { t: 'Status', v: (p) => html`<${Status} s=${p.status} />` },
      { t: 'Anúncios', cl: 'dir', v: (p) => fmt(p.ativos) }, { t: '7 dias', cl: 'dir', v: (p) => (p.var7 == null ? '—' : html`<span class=${p.var7 >= 0 ? 'cresce' : 'cai'}>${p.var7 >= 0 ? '+' : ''}${p.var7}</span>`) },
      { t: 'Dias', cl: 'dir', v: (p) => p.dias }, { t: 'Preço', v: (p) => p.preco || '—' }]} />` : html`<div class="vazio peq">${vazio}</div>`}</div>`;
  return html`<div class="cab"><div><h1>Relatório da semana</h1><p>${nomePais(l.pais)}, gerado ${relativo(d.gerado)}. Toda segunda-feira o robô envia este resumo pelo Telegram${d.email ? ' e por e-mail' : ''}.</p></div>
      <button onClick=${() => window.print()}><${Ic} n="baixar" /> Imprimir / PDF</button></div>
    <div class="kpis"><div class="kpi"><span>Novas fortes</span><b>${d.novas.length}</b></div><div class="kpi"><span>Subindo</span><b>${d.altas.length}</b></div>
      <div class="kpi"><span>Caindo</span><b>${d.caindo.length}</b></div><div class="kpi"><span>Rodadas do robô</span><b>${(d.robo.ok || 0) + (d.robo.erro || 0)}</b><small>${d.robo.erro || 0} com erro</small></div></div>
    <div class="grade-2">${tab('Novas fortes (até 7 dias, 10+ anúncios)', d.novas, 'Nenhuma oferta nova forte nesta semana.')}${tab('Maiores altas em 7 dias', d.altas, 'Precisa de mais de uma contagem para medir alta.')}
      ${tab('Melhores para modelar', d.melhoresParaModelar, 'Nenhuma oferta pronta para modelar nesta semana.')}${tab('Suas ofertas acompanhadas', d.seguidos, 'Salve ofertas com a estrela para acompanhar aqui.')}
      ${d.caindo.length ? tab('Saturando ou caindo', d.caindo, '') : null}</div>`;
}
