import { AssistantRuntimeProvider, useExternalStoreRuntime } from '@assistant-ui/react';
import { AppShell } from './components/layout/AppShell.js';
import { useYacaWeb } from './hooks/useYacaWeb.js';

function App() {
  const yaca = useYacaWeb();
  const runtime = useExternalStoreRuntime(yaca.assistantStore);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AppShell yaca={yaca} />
    </AssistantRuntimeProvider>
  );
}

export default App;
