import { VoultClient } from 'voult-sdk';

const client = new VoultClient({
  clientId: process.env.VOULT_CLIENT_ID || process.env.CLIENT_ID,
  clientSecret: process.env.VOULT_CLIENT_SECRET || process.env.CLIENT_SECRET,
  baseURL: process.env.VOULT_BASE_URL,
});

export default client;
