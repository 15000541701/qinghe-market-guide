import { mkdir, writeFile } from 'node:fs/promises';
const photos = {
  spinach: '1576045057995-568f588f82fb',
  bokchoy: '1622206151226-18ca2c9ab4a1',
  lettuce: '1622206151226-18ca2c9ab4a1',
  broccoli: '1459411621453-7b03977f4bfc',
  tomato: '1546094096-0df4bcaaa337',
  carrot: '1447175008436-054170c2e979',
  apple: '1560806887-1e4cd0b6cbd6',
  banana: '1571771894821-ce9b6c11b08e',
  orange: '1547514701-42782101795e',
  strawberry: '1464965911861-746a04b4bca6',
  fish: '1510130387422-82bed34b37e9',
  salmon: '1519708227418-c8fd9a32b7a2',
  shrimp: '1565680018434-b513d5e5fd47',
  chicken: '1604503468506-a8da13d82791',
  pork: '1607623814075-e51df1bdc82f',
  beef: '1607623814075-e51df1bdc82f',
  milk: '1563636619-e9143da7973b',
  yogurt: '1488477181946-6428a0291777',
  egg: '1518569656558-1f25e69d93d7',
  bread: '1509440159596-0249088772ff',
  croissant: '1555507036-ab1f4038808a',
  rice: '1586201375761-83865001e31c',
  oil: '1474979266404-7eaacbcd87c5',
  market: '1542838132-92c53300491e',
};
await mkdir('public/images', { recursive: true });
const items = Object.entries(photos);
const failures = [];
await Promise.all(
  Array.from({ length: 5 }, async () => {
    while (items.length) {
      const [name, id] = items.shift();
      const url =
        name === 'bokchoy'
          ? 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Bok_Choy_%2849553125456%29.jpg/330px-Bok_Choy_%2849553125456%29.jpg'
          : `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${name === 'market' ? 900 : 600}&q=82`;
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw Error(String(response.status));
        await writeFile(`public/images/${name}.jpg`, Buffer.from(await response.arrayBuffer()));
        const provider = name === 'bokchoy' ? 'Wikimedia Commons' : 'Unsplash';
        await writeFile(
          `public/images/${name}.source.json`,
          JSON.stringify(
            {
              origin: url,
              provider,
              usage: 'Illustrative product photograph; not actual stock',
              downloaded: new Date().toISOString(),
            },
            null,
            2,
          ),
        );
        await writeFile(
          `public/images/${name}.jpg.json`,
          JSON.stringify({
            prompt: `Sourced photograph. Origin: ${url}; provider: ${provider}; illustrative, not actual stock.`,
          }),
        );
        console.log(`${name}: saved`);
      } catch (error) {
        failures.push(`${name}: ${error.message}`);
      }
    }
  }),
);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}
