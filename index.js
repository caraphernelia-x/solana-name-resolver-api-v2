import { Connection, PublicKey } from '@solana/web3.js';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=fcafd661-47af-46d2-9b58-2fa732de3fdc');
const NAME_PROGRAM_ID = new PublicKey('ALTpV7aUcpGjMwCk87nF1oT45hUmNxFcsUvxUNR3d1V5');

async function resolveSolName(wallet) {
  try {
    const key = new PublicKey(wallet);
    const filters = [
      { dataSize: 96 },
      { memcmp: { offset: 32, bytes: key.toBase58() } }
    ];

    const accounts = await connection.getProgramAccounts(NAME_PROGRAM_ID, { filters });
    if (accounts.length === 0) return null;

    const nameAccount = accounts[0].pubkey;
    const info = await connection.getAccountInfo(nameAccount);
    if (!info?.data) return null;

    const nameBuf = info.data.slice(96); // Skip header
    const nameEnd = nameBuf.indexOf(0);
    const decoded = new TextDecoder().decode(
      nameEnd === -1 ? nameBuf : nameBuf.slice(0, nameEnd)
    );

    return decoded + '.sol';
  } catch (err) {
    console.error(`Resolve error for ${wallet}:`, err.message);
    return null;
  }
}

app.post('/resolve', async (req, res) => {
  const { addresses } = req.body;
  if (!Array.isArray(addresses)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const results = {};
  for (const addr of addresses) {
    results[addr] = await resolveSolName(addr);
  }
  res.json(results);
});

app.get('/', (_, res) => {
  res.send('✅ SNS Resolver API is live.');
});

app.listen(PORT, () => {
  console.log(`✅ Resolver API running on port ${PORT}`);
});