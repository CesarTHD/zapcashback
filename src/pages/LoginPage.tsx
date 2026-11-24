import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import logo from "/favicon.ico";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast({ title: "Login realizado com sucesso!" });
      navigate("/dashboard");
    } catch (error) {
      toast({ 
        title: "Erro ao fazer login", 
        description: error instanceof Error ? error.message : "Verifique suas credenciais",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary flex-col justify-between p-12 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border-2 border-current" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full border border-current" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full border border-current" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <img src={logo} alt="" className="w-10 h-10 drop-shadow" />
            <span className="text-2xl font-light tracking-tight"><span className="font-bold">SAT</span> Cashback</span>
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Alcance seus clientes
            <br />
            onde eles já estão.
          </h1>
          <p className="text-lg opacity-80 max-w-md">
            Conecte o banco de dados do seu ERP ao WhatsApp e envie campanhas direcionadas que geram resultados reais.
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <p className="text-3xl font-bold">98%</p>
              <p className="text-sm opacity-70">Taxa de abertura</p>
            </div>
            <div>
              <p className="text-3xl font-bold">45%</p>
              <p className="text-sm opacity-70">Taxa de resposta</p>
            </div>
            <div>
              <p className="text-3xl font-bold">3x</p>
              <p className="text-sm opacity-70">Mais conversões</p>
            </div>
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-sm opacity-60">© 2026 ZAP Cashback. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="glass w-full max-w-sm space-y-8 rounded-2xl p-8">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-4">
            <img src={logo} alt="" className="w-10 h-10" />
            <span className="text-2xl font-light tracking-tight"><span className="font-bold text-primary">SAT</span> Cashback</span>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold">Bem-vindo(a) de volta</h2>
            <p className="text-muted-foreground mt-1">Acesse sua conta</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="seu_usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded border-input" disabled={loading} />
                Lembrar de mim
              </label>
              <a href="#" className="text-sm text-primary hover:underline">
                Esqueceu a senha?
              </a>
            </div>
              <Button
                onClick={handleLogin}
                disabled={loading}
                className="w-full mt-2"
              >
                {loading ? "Conectando..." : "Entrar"}
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
