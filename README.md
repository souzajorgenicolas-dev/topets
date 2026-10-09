# Topet’s Lanches — cardápio digital

Site estático em HTML, CSS e JavaScript, sem dependências de build. A marca usa o mascote enviado e a paleta vermelha e amarela das peças do cardápio.

## Executar localmente

Sirva a pasta `outputs` por HTTP, por exemplo:

```powershell
python -m http.server 8000 --directory outputs
```

Depois abra `http://localhost:8000`. Também é possível publicar os arquivos desta pasta em qualquer hospedagem estática.

## Manutenção

- `data.js`: produtos e preços do cardápio, telefone de WhatsApp, acompanhamentos do açaí, taxa de entrega e dados configuráveis da loja.
- `app.js`: busca, filtros, personalização do açaí, adicionais individuais nos lanches e sacola persistida no navegador e montagem da mensagem do pedido.
- `styles.css`: identidade visual e layouts responsivos.
- `assets/topets-mascote.png`: mascote/logo enviado.

A taxa de entrega está como `null`, porque não foi informada. O site não soma uma taxa até que um valor seja configurado. Endereço e horários também ficaram vazios, pois não constavam no material recebido.

O envio é concluído pelo cliente no WhatsApp: o site abre a conversa com a mensagem preenchida para revisão, sem enviar automaticamente.

