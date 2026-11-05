// Painel local: http://localhost:8899
import http from 'node:http';
import { handler } from './app.js';

const PORTA = Number(process.env.PORT || 8899);
http.createServer(handler).listen(PORTA, () => console.log(`Painel do Minerador rodando em http://localhost:${PORTA}`));
