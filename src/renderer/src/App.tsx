import { useEffect, useState } from 'react';
import { AppPingPayload } from '@shared/ipc';
import { pingApp } from './ipc';

export function App() {
  const [pingData, setPingData] = useState<AppPingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    pingApp()
      .then((res) => {
        if (!isMounted) return;
        if (res.ok) {
          setPingData(res.value);
        } else {
          setError(res.error);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>Cairn</h1>
      {error && <p role="alert">Error: {error}</p>}
      {pingData ? (
        <p data-testid="ping-result">
          Cairn v{pingData.version} on {pingData.platform}
        </p>
      ) : (
        !error && <p>Connecting...</p>
      )}
    </main>
  );
}
