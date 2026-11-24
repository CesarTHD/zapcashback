import { AppLayout } from "@/components/AppLayout";
import { MessageSquare, Settings as SettingsIcon, ExternalLink, Check, Globe, Key, Server, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const SettingsPage = () => {
  return (
    <AppLayout title="Configurações" subtitle="Gerencie suas integrações e preferências.">
      <div className="space-y-6 max-w-3xl">

        {/* Evolution API */}
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Evolution API</h3>
              <p className="text-sm text-muted-foreground">Conecte sua instância de Whatsapp via Evolution API</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Server URL</Label>
              <Input placeholder="https://api.yourserver.com" defaultValue="https://evo.example.com" />
            </div>
            <div className="space-y-2">
              <Label>Global API Key</Label>
              <Input type="password" defaultValue="B6D711FCDE4D4FD5936544120E713976" />
            </div>
            <div className="space-y-2">
              <Label>Instance Name</Label>
              <Input defaultValue="myinstance" />
            </div>
            <div className="space-y-2">
              <Label>Instance API Key</Label>
              <Input type="password" defaultValue="A1B2C3D4E5F6..." />
            </div>
          </div>
          <div className="p-4 glass-tint rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Cesar_4202</p>
                <p className="text-xs text-muted-foreground">+55 11 91234-5678 · WhatsApp Web</p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-sm text-primary">
              <Check className="w-4 h-4" /> Conectado
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Testar Conexão
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> Abrir Dashboard
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
