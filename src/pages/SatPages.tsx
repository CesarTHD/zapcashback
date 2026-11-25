import { FormEvent, ReactNode, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Lightbulb, RefreshCw } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type Cell = string | number | null;
type Row = Record<string, Cell>;
type Page = { rows: Row[]; more: boolean };
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (value: Cell | undefined) => value == null ? "—" : currency.format(Number(value));
const cents = (value: Cell | undefined) => value == null ? "—" : money(Number(value) / 100);
const api = import.meta.env.DEV ? "" : (import.meta.env.VITE_SAT_API_URL || "");

async function fetchSat(path: string, options: RequestInit) {
  const unavailable = "A API do SAT Cashback está indisponível. No ambiente local, verifique se o backend está rodando na porta 3333.";
  const response = await fetch(`${api}/sat${path}`, options).catch(() => { throw new Error(unavailable); });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || (response.status >= 500 ? unavailable : "Falha ao consultar o SAT Cashback"));
  }
  return response;
}

async function request<T>(path: string, body?: object, method = body ? "POST" : "GET") {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessão encerrada");
  const response = await fetchSat(path, {
    method,
    headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

function useSat<T>(path: string) {
  const { user } = useAuth();
  return useQuery({ queryKey: ["sat", user?.id, path], queryFn: () => request<T>(path), retry: false });
}

function useSatAccess() {
  return useSat<{ role: string; branches: number[] | null }>("/access").data;
}

/* ───────────── Blocos visuais ───────────── */

function Screen({ title, subtitle, actions, children }: { title: string; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return <AppLayout title={title} subtitle={subtitle} actions={actions}>
    <div className="mx-auto max-w-screen-2xl space-y-6">{children}</div>
  </AppLayout>;
}

function Card({ title, actions, children, flush, className = "" }: {
  title?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; className?: string;
}) {
  return <section className={`glass min-w-0 rounded-xl ${className}`}>
    {(title || actions) && <header className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-900/10 px-5 py-3">
      {title ? <h2 className="text-sm font-semibold">{title}</h2> : <span />}
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>}
    <div className={flush ? "" : "p-5"}>{children}</div>
  </section>;
}

function Status({ pending, error }: { pending?: boolean; error?: Error | null }) {
  if (error) return <p role="alert" className="rounded-lg border-l-4 border-destructive bg-red-50/80 backdrop-blur-md px-4 py-3 text-sm text-destructive">{error.message}</p>;
  return pending ? <p role="status" className="text-sm text-muted-foreground">Carregando…</p> : null;
}

function Done({ children }: { children: ReactNode }) {
  return <p role="status" className="rounded-lg border-l-4 border-primary bg-emerald-50/80 backdrop-blur-md px-4 py-2.5 text-sm text-accent-foreground">{children}</p>;
}

function Grid({ columns, rows, right = [], bare }: { columns: string[]; rows: ReactNode[][]; right?: number[]; bare?: boolean }) {
  if (!rows.length) return <p className={`text-sm text-muted-foreground ${bare ? "px-5 py-6" : "rounded-md border border-dashed p-4"}`}>Nenhum registro encontrado.</p>;
  return <div className={`overflow-x-auto ${bare ? "" : "rounded-lg border border-white/70 bg-white/40"}`}><table className="w-full text-left text-sm">
    <thead><tr className="glass-tint border-b border-emerald-900/10">{columns.map((column, i) => <th key={column} scope="col"
      className={`whitespace-nowrap px-4 py-2.5 text-xs font-medium text-muted-foreground ${right.includes(i) ? "text-right" : ""}`}>{column}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={i} className="border-b border-emerald-900/[0.06] transition-colors last:border-0 hover:bg-emerald-50/60">{row.map((cell, j) =>
      <td key={j} className={`whitespace-nowrap px-4 py-2.5 ${right.includes(j) ? "text-right tabular-nums" : ""}`}>{cell ?? <span className="text-muted-foreground">—</span>}</td>)}</tr>)}</tbody>
  </table></div>;
}

function Pagination({ offset, more, change }: { offset: number; more: boolean; change: (n: number) => void }) {
  return <div className="flex items-center justify-between gap-3 border-t border-emerald-900/10 px-5 py-3 text-sm">
    <span className="text-muted-foreground">Página {offset/50+1}</span>
    <div className="flex gap-2">
      <Button size="sm" variant="outline" disabled={!offset} onClick={() => change(offset-50)}>Anterior</Button>
      <Button size="sm" variant="outline" disabled={!more} onClick={() => change(offset+50)}>Próxima</Button>
    </div>
  </div>;
}

const statusColors: Record<string, string> = {
  disponível: "text-emerald-700", ativa: "text-emerald-700", autorizado: "text-emerald-700", sim: "text-emerald-700",
  pendente: "text-amber-700", expirado: "text-muted-foreground", inativa: "text-muted-foreground", não: "text-muted-foreground",
  estornado: "text-red-600", estorno: "text-red-600", cancelado: "text-red-600", resgatado: "text-sky-700", indefinido: "text-amber-700",
};

function StatusText({ value }: { value: Cell | undefined }) {
  if (value == null || value === "") return null;
  return <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusColors[String(value).toLowerCase()] ?? "text-foreground/80"}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />{String(value)}
  </span>;
}

function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="font-medium text-primary hover:underline">{children}</Link>;
}

function LinkButton({ to, children, primary }: { to: string; children: ReactNode; primary?: boolean }) {
  return <Button asChild size="sm" variant={primary ? "default" : "outline"}><Link to={to}>{children}</Link></Button>;
}

/** Faixa única de indicadores, células separadas por linhas finas. */
function Stats({ values, cols = "md:grid-cols-4", highlight }: { values: [string, Cell | undefined, ReactNode?][]; cols?: string; highlight?: boolean }) {
  return <dl className={`glass grid grid-cols-2 gap-px overflow-hidden rounded-xl !bg-emerald-900/[0.07] ${cols}`}>{values.map(([title, value, hint], i) =>
    <div key={title} className={highlight && i === 0 ? "glass-green !rounded-none !border-0 !shadow-none px-4 py-3.5" : "bg-white/60 px-4 py-3.5"}>
      <dt className={`text-xs ${highlight && i === 0 ? "text-emerald-100/80" : "text-muted-foreground"}`}>{title}</dt>
      <dd className="mt-1 truncate text-xl font-semibold tabular-nums">{value ?? <span className="opacity-50">—</span>}</dd>
      {hint && <dd className={`mt-0.5 text-xs ${highlight && i === 0 ? "text-emerald-100/90" : "text-muted-foreground"}`}>{hint}</dd>}
    </div>)}</dl>;
}

/** Lista de pares rótulo/valor. */
function Facts({ items }: { items: [ReactNode, ReactNode][] }) {
  return <dl className="divide-y divide-emerald-900/10 text-sm">{items.map(([label, value], i) =>
    <div key={i} className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium tabular-nums">{value ?? "—"}</dd>
    </div>)}</dl>;
}

function Field({ label, children, className = "" }: { label: ReactNode; children: ReactNode; className?: string }) {
  return <label className={`sat-label ${className}`}>{label}{children}</label>;
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" />{label}</label>;
}

function Variables() {
  return <p className="text-xs text-muted-foreground">Variáveis disponíveis <code className="rounded bg-muted px-1">{"{{nome}}"}</code> e <code className="rounded bg-muted px-1">{"{{saldo_cashback}}"}</code></p>;
}

/* ───────────── Clientes ───────────── */

export function SatClients() {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState("");
  const [offset, setOffset] = useState(0);
  const result = useSat<Page>("/clients?" + new URLSearchParams({ q, city, sort, offset: String(offset) }));
  const summary = useSat<{ total: number; birthdays: number; active90: number; withCashback: number; whatsapp: number | null }>("/clients/summary");
  const download = useMutation({ mutationFn: async (format: "csv" | "xlsx") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Sessão encerrada");
    const response = await fetchSat(`/clients/export.${format}?${new URLSearchParams({ q, city, sort })}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = `clientes-sat.${format}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } });
  return <Screen title="Clientes" subtitle="Cadastro do ERP SAT"
    actions={<>
      <Button size="sm" variant="outline" disabled={download.isPending} onClick={() => download.mutate("xlsx")}><Download />Exportar XLSX</Button>
      <Button size="sm" variant="outline" disabled={download.isPending} onClick={() => download.mutate("csv")}><Download />CSV</Button>
    </>}>
    {summary.data && <Stats highlight cols="md:grid-cols-5" values={[["Clientes cadastrados",summary.data.total.toLocaleString("pt-BR")],
      ["Compraram nos últimos 90 dias",summary.data.active90.toLocaleString("pt-BR")],["Com cashback disponível",summary.data.withCashback.toLocaleString("pt-BR")],
      ["Aniversariantes do mês",summary.data.birthdays.toLocaleString("pt-BR")],
      ["WhatsApp promocional autorizado",summary.data.whatsapp == null ? null : summary.data.whatsapp.toLocaleString("pt-BR")]]} />}
    <Card flush>
      <div className="flex flex-wrap items-end gap-3 border-b px-5 py-4">
        <Field label="Busca" className="min-w-56 flex-1"><Input aria-label="Busca" placeholder="Nome, CPF/CNPJ ou telefone" value={q} onChange={e => {setQ(e.target.value); setOffset(0);}} /></Field>
        <Field label="Cidade" className="w-full sm:w-48"><Input aria-label="Cidade" placeholder="Todas" value={city} onChange={e => {setCity(e.target.value); setOffset(0);}} /></Field>
        <Field label="Ordenação" className="w-full sm:w-44"><select className="sat-select" aria-label="Ordenação" value={sort} onChange={e => {setSort(e.target.value); setOffset(0);}}>
          <option value="">Nome</option><option value="recent">Última compra</option><option value="spent">Total gasto</option>
        </select></Field>
      </div>
      {(result.isPending || result.error || download.error) && <div className="space-y-2 px-5 py-4">
        <Status pending={result.isPending} error={result.error} /><Status error={download.error} />
      </div>}
      {result.data && <><Grid bare right={[4,5,7,8]} columns={["Nome","Telefone","Documento","Nascimento","Compras","Total gasto","Última compra","Dias sem comprar","Cashback","WhatsApp promocional"]}
        rows={result.data.rows.map(r => [<TextLink to={`/contacts/${r.CODCLI}`}>{r.NOME}</TextLink>,
          r.TELEFONE,r.CPF,r.NASCIMENTO,r.COMPRAS,money(r.TOTAL_GASTO),r.ULTIMA_COMPRA,r.DIAS_SEM_COMPRAR,cents(r.AVAILABLE),<StatusText value={r.WHATSAPP} />])} />
        <Pagination offset={offset} more={result.data.more} change={setOffset} /></>}
    </Card>
  </Screen>;
}

function birthdayThisMonth(value: Cell | undefined) {
  const text = String(value ?? "");
  const month = text.match(/^\d{4}-(\d{2})-\d{2}/)?.[1] ?? text.match(/^\d{2}\/(\d{2})\/\d{4}/)?.[1];
  return !!month && Number(month) === new Date().getMonth() + 1;
}

function SaleItems({ sale, items, close }: { sale: Row | null; close: () => void;
  items: { data?: Page; isPending: boolean; error: Error | null } }) {
  const quantity = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });
  const returned = (r: Row) => r.CANC ? "Cancelado" : Number(r.QUANT_DEVOLVIDO) > 0 ? `Devolvido ${quantity.format(Number(r.QUANT_DEVOLVIDO))}` : null;
  return <Dialog open={!!sale} onOpenChange={open => { if (!open) close(); }}>
    <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
      <DialogHeader className="border-b px-6 py-4">
        <DialogTitle>Itens da venda {sale?.ID_OE}</DialogTitle>
        <DialogDescription>{sale && `${String(sale.DIA).split("-").reverse().join("/")} · Filial ${sale.LOJA} · Total ${money(sale.TOTAL)}`}</DialogDescription>
      </DialogHeader>
      <div className="max-h-[60vh] overflow-y-auto">
        {(items.isPending || items.error) && <div className="px-6 py-4"><Status pending={items.isPending} error={items.error} /></div>}
        {items.data && <Grid bare right={[1,2,3,4]} columns={["Produto","Qtd.","Unitário","Desconto","Total","Situação"]}
          rows={items.data.rows.map(r => [<span className="block max-w-[18rem] truncate" title={String(r.NOME ?? "")}>
              {r.NOME || `Produto ${r.COD}`}<span className="ml-2 text-xs text-muted-foreground">#{r.COD}</span></span>,
            quantity.format(Number(r.QUANT ?? 0)),money(r.UNITARIO),money(r.DESCONTO),<span className="font-semibold">{money(r.TOTAL)}</span>,
            <StatusText value={returned(r)} />])} />}
      </div>
      {items.data && <div className="flex items-center justify-between gap-3 border-t px-6 py-3 text-sm">
        <span className="text-muted-foreground">{items.data.rows.length} {items.data.rows.length === 1 ? "item" : "itens"}{items.data.more ? " (exibindo os 100 primeiros)" : ""}</span>
        <span>Total dos itens <span className="ml-1 font-semibold tabular-nums">{money(items.data.rows.reduce((sum,r) => sum+Number(r.TOTAL ?? 0),0))}</span></span>
      </div>}
    </DialogContent>
  </Dialog>;
}

export function SatClient() {
  const { id } = useParams();
  const [offset,setOffset] = useState(0);
  const [sale,setSale] = useState<Row | null>(null);
  const data = useSat<{ client: Row; metrics: Row; sales: Row[]; more: boolean }>(`/clients/${id}?offset=${offset}`);
  const wallet = useSat<{ balance: Row; credits: Row[]; messages: Row[];
    consent: { promotional: boolean; transactional: boolean; opted_out: boolean } | null }>(`/clients/${id}/cashback`);
  const { user } = useAuth();
  const satAccess = useSatAccess();
  const cache = useQueryClient();
  const saveConsent = useMutation({ mutationFn: (form: FormData) => request(`/clients/${id}/consent`, {
    promotional: form.get("promotional") === "on", transactional: form.get("transactional") === "on",
    optedOut: form.get("optedOut") === "on", evidence: form.get("evidence"),
  }, "PUT"), onSuccess: () => cache.invalidateQueries({ queryKey: ["sat"] }) });
  const items = useQuery({ queryKey: ["sat",user?.id,id,sale?.DIA,sale?.ID_OE,"items"], enabled: !!sale,
    queryFn: () => request<Page>(`/clients/${id}/sales/${sale?.DIA}/${sale?.ID_OE}/items`), retry: false });
  const { client, metrics, sales, more } = data.data ?? {};
  const initials = String(client?.NOME ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
  return <Screen title={String(client?.NOME ?? "Perfil do cliente")} subtitle={<Link to="/contacts" className="hover:text-primary">← Clientes</Link>}
    actions={<LinkButton to={`/cashback?customer=${id}`}>Movimentações de cashback</LinkButton>}>
    <Status pending={data.isPending} error={data.error} />
    {client && metrics && sales && <>
      <section className="glass-green flex flex-wrap items-center gap-4 rounded-xl p-5">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-lg font-bold backdrop-blur-md">{initials}</div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">{client.NOME}
            {birthdayThisMonth(client.NASCIMENTO) && <span className="rounded-md bg-amber-300/90 px-2 py-0.5 text-xs font-semibold text-amber-950">Aniversário neste mês</span>}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-emerald-50/80">
            <span>{client.CPF || "Sem documento"}</span><span>{client.TELEFONE || "Sem telefone"}</span>
            <span>{client.CIDADE || "Sem cidade"}</span><span>Nascimento {client.NASCIMENTO || "—"}</span>
          </p>
        </div>
        {wallet.data && <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-right backdrop-blur-md">
          <p className="text-xs text-emerald-100/80">Cashback disponível</p>
          <p className="text-2xl font-bold tabular-nums">{cents(wallet.data.balance.available)}</p>
        </div>}
      </section>
      <Stats highlight cols="md:grid-cols-3 xl:grid-cols-6" values={[["Total gasto",money(metrics.TOTAL_GASTO)],["Compras",metrics.COMPRAS],["Ticket médio",money(metrics.TICKET_MEDIO)],
        ["Última compra",metrics.ULTIMA_COMPRA],["Dias sem comprar",metrics.DIAS_SEM_COMPRAR],["Intervalo médio em dias",metrics.FREQUENCIA]]} />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <Card title="Compras" flush>
            <Grid bare right={[3,4]} columns={["Data","Venda","Filial","Total","Desconto","Itens","Cashback"]} rows={sales.map(r =>
              [r.DIA,r.ID_OE,r.LOJA,money(r.TOTAL),money(r.DESCONTO),
                <Button size="sm" variant="ghost" className="h-7 text-primary" onClick={() => setSale(r)}>Ver itens</Button>,
                <TextLink to={`/cashback?customer=${id}&date=${r.DIA}&sale=${r.ID_OE}`}>Simular crédito</TextLink>])} />
            <Pagination offset={offset} more={!!more} change={setOffset} />
          </Card>
          <SaleItems sale={sale} items={items} close={() => setSale(null)} />
        </div>
        <div className="space-y-6">
          <Status pending={wallet.isPending} error={wallet.error} />
          {wallet.data && <>
            <Card title="Carteira">
              <Facts items={[["Disponível",<span className="text-primary">{cents(wallet.data.balance.available)}</span>],["Resgatado",cents(wallet.data.balance.redeemed)],
                ["Total gerado",cents(wallet.data.balance.generated)],["Expirado",cents(wallet.data.balance.expired)]]} />
            </Card>
            <Card title="Comunicação">
              <div className="space-y-4">
                <Facts items={[["WhatsApp promocional",<StatusText value={wallet.data.consent?.opted_out ? "Descadastrado" :
                  wallet.data.consent?.promotional ? "Autorizado" : "Sem autorização registrada"} />]]} />
                {wallet.data.consent?.promotional && !wallet.data.consent.opted_out &&
                  ["admin","operator"].includes(satAccess?.role ?? "") &&
                  <LinkButton primary to={`/sat-audience?customer=${id}`}>Preparar comunicação individual</LinkButton>}
                {satAccess?.role === "admin" && satAccess.branches === null && <details className="rounded-lg border border-white/70 bg-white/50 p-3">
                  <summary className="cursor-pointer text-sm font-medium">Registrar consentimento ou descadastramento</summary>
                  <form className="mt-3 space-y-3" onSubmit={event => {
                    event.preventDefault();
                    saveConsent.mutate(new FormData(event.currentTarget));
                  }}>
                    <Check name="promotional" label="Autoriza mensagens promocionais" />
                    <Check name="transactional" label="Autoriza mensagens transacionais" />
                    <Check name="optedOut" label="Descadastrar de todos os envios SAT" />
                    <Input name="evidence" aria-label="Referência da evidência" placeholder="Referência da evidência" required maxLength={100} />
                    <Button type="submit" size="sm" disabled={saveConsent.isPending}>Salvar preferências</Button>
                    <Status error={saveConsent.error} />
                    {saveConsent.isSuccess && <Done>Preferências registradas.</Done>}
                  </form>
                </details>}
              </div>
            </Card>
            <Card title="Próximos créditos a vencer">
              {wallet.data.credits.length ? <Facts items={wallet.data.credits.map(r => [
                `Filial ${r.branch} · ${r.expires_at ? String(r.expires_at).slice(0,10).split("-").reverse().join("/") : "—"}`, cents(r.amount_cents)])} />
                : <p className="text-sm text-muted-foreground">Nenhum crédito a vencer.</p>}
            </Card>
            <Card title="Últimas mensagens SAT">
              {wallet.data.messages.length ? <ul className="divide-y text-sm">{wallet.data.messages.map((r, i) =>
                <li key={i} className="py-2 first:pt-0 last:pb-0"><p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">Fila: {r.status ?? "—"} · Provedor: {r.provider_status ?? "—"}</p></li>)}</ul>
                : <p className="text-sm text-muted-foreground">Nenhuma mensagem enviada.</p>}
            </Card>
          </>}
        </div>
      </div>
    </>}
  </Screen>;
}

/* ───────────── Dashboard ───────────── */

function Chart({ title, rows, axis, color = "hsl(var(--primary))", height = 240 }: { title: string; rows: Row[]; axis: string; color?: string; height?: number }) {
  return <Card title={title}>
    {rows.length ? <ResponsiveContainer width="100%" height={height}><BarChart data={rows}>
      <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
      <XAxis dataKey={axis} fontSize={11} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} stroke="hsl(var(--muted-foreground))" />
      <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" width={56} />
      <Tooltip cursor={{ fill: "hsl(var(--accent))" }} contentStyle={{ borderRadius: 6, border: "1px solid hsl(var(--border))", fontSize: 12 }}
        formatter={value => money(Number(value))} />
      <Bar dataKey="TOTAL" name="Vendas" fill={color} radius={[2,2,0,0]} maxBarSize={28} />
    </BarChart></ResponsiveContainer> : <p className="py-8 text-center text-sm text-muted-foreground">Sem vendas no período.</p>}
  </Card>;
}

/** Vendas (barras, eixo esquerdo) comparadas com cashback gerado e resgatado (linhas, eixo direito). */
function ComparisonChart({ rows }: { rows: Row[] }) {
  const axis = { fontSize: 11, tickLine: false, stroke: "hsl(var(--muted-foreground))" };
  return <Card title="Comparativo de vendas, cashback e resgates">
    {rows.length ? <ResponsiveContainer width="100%" height={280}><ComposedChart data={rows}>
      <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
      <XAxis dataKey="DIA" {...axis} axisLine={{ stroke: "hsl(var(--border))" }} />
      <YAxis yAxisId="sales" {...axis} axisLine={false} width={64} />
      <YAxis yAxisId="cashback" orientation="right" {...axis} axisLine={false} width={56} />
      <Tooltip contentStyle={{ borderRadius: 6, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={value => money(Number(value))} />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      <Bar yAxisId="sales" dataKey="TOTAL" name="Vendas" fill="hsl(var(--primary))" fillOpacity={0.85} radius={[2,2,0,0]} maxBarSize={28} />
      <Line yAxisId="cashback" dataKey="CASHBACK_GERADO" name="Cashback gerado" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} type="monotone" />
      <Line yAxisId="cashback" dataKey="CASHBACK_RESGATADO" name="Cashback resgatado" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} type="monotone" />
    </ComposedChart></ResponsiveContainer> : <p className="py-8 text-center text-sm text-muted-foreground">Sem vendas no período.</p>}
  </Card>;
}

/** Recomendações calculadas a partir dos indicadores do período. */
function Insights({ items }: { items: ReactNode[] }) {
  if (!items.length) return null;
  return <Card title="Insights do período">
    <ul className="grid gap-3 md:grid-cols-2">{items.map((item,i) => <li key={i} className="flex gap-3 rounded-lg border border-white/70 bg-white/50 p-3 text-sm">
      <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" /><span>{item}</span></li>)}</ul>
  </Card>;
}

function dateInput(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(date);
}

export function SatDashboard() {
  const [start,setStart] = useState(() => dateInput(new Date(Date.now()-29*86400000)));
  const [end,setEnd] = useState(() => dateInput(new Date()));
  const [branch,setBranch] = useState("");
  const dates = new URLSearchParams({ start, end });
  if (branch) dates.set("branch",branch);
  const result = useSat<{ daily: Row[]; hours: Row[]; totals: Row; last: Row; cohorts: Row; prior: Row }>("/dashboard?" + dates);
  const wallet = useSat<{ rows: Row[] }>("/dashboard/cashback?" + dates);
  const walletSum = (field: string) => wallet.data?.rows.reduce((sum,row) => sum+Number(row[field]),0);
  const data = result.data;
  const weekdays = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((label,i) => ({
    label, TOTAL: data?.daily.filter(r => Number(r.SEMANA) === i).reduce((sum,r) => sum+Number(r.TOTAL),0) ?? 0,
  }));
  const best = data?.daily.reduce<Row | undefined>((current,row) => !current || Number(row.TOTAL)>Number(current.TOTAL) ? row : current,undefined);
  const hour = data?.hours.reduce<Row | undefined>((current,row) => !current || Number(row.TOTAL)>Number(current.TOTAL) ? row : current,undefined);
  const percent = new Intl.NumberFormat("pt-BR",{style:"percent",maximumFractionDigits:1});
  const variation = data && Number(data.prior.TOTAL)>0 ? Number(data.totals.TOTAL)/Number(data.prior.TOTAL)-1 : null;
  const weekdayNames = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
  const bestWeekday = weekdays.reduce((top,day,i) => day.TOTAL > weekdays[top].TOTAL ? i : top, 0);
  const generated = Number(data?.totals.CASHBACK_GERADO ?? 0);
  const redeemed = Number(data?.totals.CASHBACK_RESGATADO ?? 0);
  const salesCount = Number(data?.totals.VENDAS ?? 0);
  const insights: ReactNode[] = [];
  if (data && salesCount > 0) {
    if (weekdays[bestWeekday].TOTAL > 0) insights.push(<>Seu público compra mais às <b>{weekdayNames[bestWeekday]}s</b>. Agende campanhas para a véspera.</>);
    if (hour) insights.push(<>O pico de faturamento é por volta das <b>{String(hour.HORA)}h</b>. Mensagens enviadas antes desse horário tendem a ter mais efeito.</>);
    insights.push(<><b>{percent.format(Number(data.totals.VENDAS_COM_GERACAO)/salesCount)}</b> das vendas do período geraram cashback.</>);
    if (generated > 0 && redeemed === 0) insights.push(<>Nenhum cashback foi resgatado no período. <TextLink to="/sat-audience">Lembre os clientes com saldo disponível</TextLink>.</>);
    if (redeemed > 0) insights.push(<>As vendas com resgate somaram <b>{money(data.totals.FATURAMENTO_COM_RESGATE)}</b>, ou {money(Number(data.totals.FATURAMENTO_COM_RESGATE)/redeemed)} para cada R$ 1,00 resgatado.</>);
    if (Number(data.cohorts.INATIVOS) > 0) insights.push(<><b>{String(data.cohorts.INATIVOS)}</b> clientes compraram no período anterior e não voltaram. <TextLink to="/sat-audience">Monte uma campanha de reativação</TextLink>.</>);
  }
  const today = dateInput(new Date());
  const ranges: [string, string][] = [["7 dias", dateInput(new Date(Date.now()-6*86400000))], ["30 dias", dateInput(new Date(Date.now()-29*86400000))],
    ["90 dias", dateInput(new Date(Date.now()-89*86400000))], ["Ano", today.slice(0,4)+"-01-01"]];
  return <Screen title="Visão geral" subtitle="Vendas do ERP SAT e cashback gerado"
    actions={<div className="inline-flex overflow-hidden rounded-md border border-white/80 bg-white/55 text-xs font-medium shadow-sm backdrop-blur-md">
      {ranges.map(([label,s]) => <button key={label} type="button" onClick={() => {setStart(s); setEnd(today);}}
        className={`border-r border-emerald-900/10 px-3 py-1.5 last:border-0 ${start === s && end === today ? "btn-glow text-primary-foreground" : "hover:bg-white/80"}`}>{label}</button>)}
    </div>}>
    <div className="flex flex-wrap items-end gap-3">
      <Field label="De" className="w-40"><Input type="date" value={start} onChange={e => setStart(e.target.value)} /></Field>
      <Field label="Até" className="w-40"><Input type="date" value={end} onChange={e => setEnd(e.target.value)} /></Field>
      <Field label="Código da filial" className="w-36"><Input type="number" min="1" placeholder="Todas" value={branch} onChange={e => setBranch(e.target.value)} /></Field>
    </div>
    <Status pending={result.isPending} error={result.error} />
    {data && <>
      <Stats highlight values={[["Vendas no período",money(data.totals.TOTAL),variation == null ? null :
          <span className={variation < 0 ? "text-red-200" : "text-emerald-100"}>{variation < 0 ? "▼" : "▲"} {percent.format(variation)} vs. período anterior</span>],
        ["Quantidade de vendas",data.totals.VENDAS],["Ticket médio",money(data.totals.TICKET_MEDIO)],["Clientes compradores",data.totals.CLIENTES],
        ["Vendas com resgate de cashback",data.totals.VENDAS_COM_CASHBACK],["Novos compradores",data.cohorts.NOVOS],["Compradores recorrentes",data.cohorts.RECORRENTES],
        ["Taxa de recompra no período",Number(data.totals.CLIENTES) > 0 ? percent.format(Number(data.cohorts.RECOMPRA)/Number(data.totals.CLIENTES)) : null]]} />
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2"><Chart title="Evolução de vendas" rows={data.daily} axis="DIA" height={280} /></div>
        <Card title="Resumo do período">
          <Facts items={[["Última venda registrada",data.last.ULTIMA_VENDA],["Dia de maior faturamento",best?.DIA],
            ["Hora de maior faturamento",hour ? `${hour.HORA}h` : null],["Vendas no período anterior",money(data.prior.TOTAL)],
            ["Variação de vendas",variation == null ? null : percent.format(variation)],["Compraram só no período anterior",data.cohorts.INATIVOS]]} />
        </Card>
      </div>
      <Insights items={insights} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Chart title="Vendas por dia da semana" rows={data.daily.length ? weekdays : []} axis="label" color="hsl(var(--chart-2))" />
        <Chart title="Vendas por horário" rows={data.hours} axis="HORA" color="hsl(var(--chart-2))" />
      </div>
    </>}
    <div className="space-y-3 pt-2">
      <h2 className="text-sm font-semibold">Cashback gerado no período</h2>
      <Status pending={wallet.isPending} error={wallet.error} />
      {wallet.data && <>
        <Stats highlight values={[["Gerado",cents(walletSum("generated"))],["Ainda disponível",cents(walletSum("available"))],
          ["Resgatado",cents(walletSum("redeemed"))],["Expirado",cents(walletSum("expired"))]]} />
        {data && <ComparisonChart rows={data.daily} />}
      </>}
    </div>
  </Screen>;
}

/* ───────────── Cashback ───────────── */

const brDate = (value: Cell | undefined) => value ? String(value).slice(0,10).split("-").reverse().join("/") : "—";

export function SatCashback() {
  const [offset,setOffset] = useState(0);
  const [params] = useSearchParams();
  const customer = params.get("customer");
  const [filters,setFilters] = useState<Record<string,string>>({});
  const pageParams = new URLSearchParams({ ...filters, offset:String(offset) });
  if (customer) pageParams.set("customer",customer);
  const page = useSat<Page>("/cashback?" + pageParams);
  const role = useSatAccess()?.role;
  return <Screen title="Cashback" subtitle={customer ? `Cliente SAT ${customer}` : "Créditos de cashback no ERP SAT"}
    actions={role === "admin" && <LinkButton to="/cashback/rules">Regras das lojas</LinkButton>}>
    <div className="grid items-start gap-6">
      <div className="min-w-0 space-y-6">
        <Card title="Movimentações" flush>
          <form className="flex flex-wrap items-end gap-3 border-b px-5 py-4" onSubmit={e => {
            e.preventDefault();
            setFilters(Object.fromEntries(Array.from(new FormData(e.currentTarget)).filter(([,v]) => v !== "").map(([k,v]) => [k,String(v)])));
            setOffset(0);
          }}>
            <Field label="Cliente" className="min-w-56 flex-1"><Input name="q" placeholder="Nome, CPF/CNPJ ou telefone" maxLength={100} /></Field>
            <Field label="Filial" className="w-28"><Input type="number" min="1" name="branch" placeholder="Todas" /></Field>
            <Field label="Venda a partir de" className="w-40"><Input type="date" name="start" /></Field>
            <Field label="Venda até" className="w-40"><Input type="date" name="end" /></Field>
            <Field label="Status" className="w-36"><select name="status" className="sat-select">
              <option value="">Todos</option>{["disponível","expirado","resgatado","cancelado","indefinido"].map(s => <option key={s}>{s}</option>)}
            </select></Field>
            <Button type="submit" variant="outline">Filtrar</Button>
          </form>
          {(page.isPending || page.error) && <div className="px-5 py-4"><Status pending={page.isPending} error={page.error} /></div>}
          {page.data && <><Grid bare right={[4,5,6,7]} columns={["Cliente","Venda","Data da venda","Filial","Valor da venda","Cashback","Resgatado","Saldo","Validade","Status"]}
            rows={page.data.rows.map(r => [<div className="min-w-0">
                <TextLink to={`/contacts/${r.customer}`}>{r.name || `Cliente ${r.customer}`}</TextLink>
                <p className="text-xs text-muted-foreground">{r.phone || "Sem telefone"} · #{r.customer}</p></div>,
              r.sale_id,brDate(r.sale_date),r.branch ?? "—",cents(r.sale_cents),<span className="font-semibold">{cents(r.amount_cents)}</span>,
              cents(r.redeemed_cents),cents(r.remaining_cents),brDate(r.expires_at),<StatusText value={r.status} />])} />
            <Pagination offset={offset} more={page.data.more} change={setOffset} /></>}
        </Card>
      </div>
    </div>
  </Screen>;
}

/* ───────────── Regras ───────────── */

export function SatRules() {
  const query = useSat<{ rows: Row[] }>("/rules");
  const percent = (value: Cell | undefined) => value == null ? "—" : `${Number(value).toLocaleString("pt-BR")}%`;
  return <Screen title="Regras de cashback" subtitle={<Link to="/cashback" className="hover:text-primary">← Cashback</Link>}>
    <Status pending={query.isPending} error={query.error} />
    {query.data && <Card title="Configuração por loja no ERP SAT" flush>
      <Grid bare right={[3,4,5,6]} columns={["Loja","Nome","Cashback","Percentual","Percentual da venda","Compra mínima","Validade (dias)"]}
        rows={query.data.rows.map(r => [r.branch,r.name ?? "—",<StatusText value={r.enabled ? "Ativa" : "Inativa"} />,
          percent(r.percent),percent(r.sale_percent),cents(r.minimum_cents),r.validity_days ?? "—"])} />
      <p className="border-t px-5 py-3 text-xs text-muted-foreground">As regras são lidas da tabela LOJAS do ERP. Para alterá-las, use o cadastro de lojas no SAT.</p>
    </Card>}
  </Screen>;
}

/* ───────────── Público / campanhas ───────────── */

export function SatAudience() {
  const [search] = useSearchParams();
  const [filters,setFilters] = useState<Record<string,FormDataEntryValue> | null>(null);
  const [campaignId,setCampaignId] = useState(() => crypto.randomUUID());
  const [historyId,setHistoryId] = useState("");
  const [messageOffset,setMessageOffset] = useState(0);
  const [template,setTemplate] = useState("");
  const cache = useQueryClient();
  const campaigns = useSat<{ rows: Row[] }>("/campaigns");
  const { user } = useAuth();
  const satAccess = useSatAccess();
  const history = useQuery({ queryKey: ["sat",user?.id,"campaign-messages",historyId,messageOffset], enabled: !!historyId,
    queryFn: () => request<Page>(`/campaigns/${historyId}/messages?offset=${messageOffset}`), retry: false });
  const preview = useMutation({ mutationFn: (selected: Record<string,FormDataEntryValue>) =>
    request<{ count: number }>("/audiences/preview",selected),
    onSuccess: (_,selected) => setFilters(selected),
  });
  const campaign = useMutation({ mutationFn: (form: FormData) => {
    const scheduled = String(form.get("scheduleAt") || "");
    return request<{ recipients: number }>("/campaigns",{ id: campaignId, name: form.get("name"), template,
      scheduleAt: scheduled ? new Date(scheduled).toISOString() : new Date().toISOString(), filters });
  }, onSuccess: () => {
    setFilters(null);
    void cache.invalidateQueries({ queryKey: ["sat"] });
  } });
  return <Screen title="Público SAT" subtitle="A prévia considera clientes com telefone e autorização promocional registrada."
    actions={satAccess?.role === "admin" && satAccess.branches === null && <LinkButton to="/sat-audience/automations">Configurar automações</LinkButton>}>
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_400px]">
      <Card title="Filtros do público">
        <form className="space-y-4" onChange={() => {
          setFilters(null);
          preview.reset();
        }} onSubmit={event => {
          event.preventDefault();
          setFilters(null);
          setCampaignId(crypto.randomUUID());
          campaign.reset();
          preview.mutate(Object.fromEntries([...new FormData(event.currentTarget)].filter(([,value]) => value !== "")));
        }}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Código do cliente"><Input name="customer" type="number" min="0" defaultValue={search.get("customer") ?? ""} /></Field>
            <Field label="Cidade"><Input name="city" maxLength={100} /></Field>
            <Field label="Cashback"><select name="wallet" className="sat-select">
              <option value="">Qualquer saldo</option><option value="available">Disponível</option><option value="expiring">Próximo de expirar</option>
              <option value="used">Já resgatou</option><option value="never_used">Nunca resgatou</option>
            </select></Field>
            <Field label="Última compra a partir de"><Input name="lastPurchaseFrom" type="date" /></Field>
            <Field label="Última compra até"><Input name="lastPurchaseTo" type="date" /></Field>
            <Field label="Dias até o vencimento"><Input name="expiresWithinDays" type="number" min="1" max="365" defaultValue="7" /></Field>
            <Field label="Mínimo de dias sem comprar"><Input name="minDays" type="number" min="0" /></Field>
            <Field label="Máximo de dias sem comprar"><Input name="maxDays" type="number" min="0" /></Field>
            <Field label="Mínimo de compras"><Input name="minPurchases" type="number" min="0" /></Field>
            <Field label="Gasto mínimo em centavos"><Input name="minSpentCents" type="number" min="0" /></Field>
            <Field label="Ticket médio mínimo em centavos"><Input name="minTicketCents" type="number" min="0" /></Field>
          </div>
          <div className="flex justify-end border-t pt-4"><Button type="submit" disabled={preview.isPending}>Contar destinatários elegíveis</Button></div>
        </form>
      </Card>
      <div className="space-y-4">
        <div className="glass-green rounded-xl p-5">
          <p className="text-xs text-emerald-100/80">Destinatários elegíveis</p>
          <p className="mt-1 text-4xl font-bold tabular-nums" role="status">{preview.data ? preview.data.count.toLocaleString("pt-BR") : "—"}</p>
          {!preview.data && !preview.isPending && <p className="mt-1 text-xs text-emerald-100/80">Defina os filtros e conte o público.</p>}
          <div className="mt-2"><Status pending={preview.isPending} error={preview.error} /></div>
        </div>
        {filters && !!preview.data?.count && <Card title="Campanha promocional SAT">
          <form className="space-y-3" onSubmit={event => {
            event.preventDefault();
            campaign.mutate(new FormData(event.currentTarget));
          }}>
            <Field label="Nome"><Input name="name" required maxLength={100} /></Field>
            <Field label="Agendar no seu fuso local (opcional)"><Input name="scheduleAt" type="datetime-local" /></Field>
            <Field label="Mensagem"><textarea className="sat-textarea" rows={5}
              value={template} onChange={e => setTemplate(e.target.value)} required maxLength={2000} /></Field>
            <Variables />
            {template && <div className="rounded-lg border-l-4 border-primary bg-emerald-50/70 p-3 text-sm">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Prévia com campos ilustrativos</p>
              <p className="whitespace-pre-wrap">{template.replace(/\{\{nome\}\}/g,"[Nome do cliente]").replace(/\{\{saldo_cashback\}\}/g,"[Saldo em reais]")}</p>
            </div>}
            <Button type="submit" className="w-full" disabled={campaign.isPending}>Colocar na fila</Button>
          </form>
        </Card>}
        <Status error={campaign.error} />
        {campaign.data && <Done>Campanha registrada para {campaign.data.recipients} destinatários.</Done>}
      </div>
    </div>
    <Card title="Campanhas SAT" flush
      actions={<Button size="sm" variant="ghost" onClick={() => void cache.invalidateQueries({ queryKey: ["sat"] })}><RefreshCw />Atualizar</Button>}>
      {(campaigns.isPending || campaigns.error) && <div className="px-5 py-4"><Status pending={campaigns.isPending} error={campaigns.error} /></div>}
      {campaigns.data && <Grid bare right={[2,3,4,5,6,7,8]} columns={["Campanha","Agendada","Público","Na fila","Em envio","Aceitas pela API","Falharam","Ignoradas","Indeterminadas","Histórico"]}
        rows={campaigns.data.rows.map(r => [<span className="font-medium">{r.name}</span>,r.schedule_at ? new Date(String(r.schedule_at)).toLocaleString("pt-BR") : null,
          r.total,r.queued,r.sending,r.accepted,r.failed,r.skipped,r.unknown,
          <Button size="sm" variant="ghost" className="h-7 text-primary" onClick={() => {setHistoryId(String(r.id)); setMessageOffset(0);}}>Ver mensagens</Button>])} />}
    </Card>
    {historyId && <Card title="Mensagens da campanha" flush>
      {(history.isPending || history.error) && <div className="px-5 py-4"><Status pending={history.isPending} error={history.error} /></div>}
      {history.data && <><Grid bare right={[2]} columns={["Cliente SAT","Status da fila","Tentativas","Status do provedor"]}
        rows={history.data.rows.map(r => [r.customer,r.status,r.attempts,r.provider_status])} />
        <Pagination offset={messageOffset} more={history.data.more} change={setMessageOffset} /></>}
    </Card>}
  </Screen>;
}

/* ───────────── Automações ───────────── */

const automationNames: Record<string,string> = {
  granted: "Cashback gerado", released: "Cashback liberado", expiring: "Cashback próximo do vencimento",
  expired: "Cashback expirado", inactive: "Cliente sem comprar", birthday: "Aniversário do cliente",
};

export function SatAutomations() {
  const [event,setEvent] = useState("granted");
  const cache = useQueryClient();
  const rules = useSat<{ rows: Row[] }>("/automations");
  const selected = rules.data?.rows.find(row => row.event === event);
  const save = useMutation({ mutationFn: (form: FormData) => request(`/automations/${event}`,{
    enabled: form.has("enabled"), template: form.get("template"), days: form.get("days") || 1,
  },"PUT"), onSuccess: () => cache.invalidateQueries({ queryKey: ["sat"] }) });
  return <Screen title="Automações SAT" subtitle={<Link to="/sat-audience" className="hover:text-primary">← Público SAT</Link>}>
    <Status pending={rules.isPending || save.isPending} error={rules.error || save.error} />
    {rules.data && <section className="glass grid overflow-hidden rounded-xl md:grid-cols-[260px_1fr]">
      <nav aria-label="Evento" className="glass-tint border-b border-emerald-900/10 py-2 md:border-b-0 md:border-r">
        {Object.entries(automationNames).map(([key,name]) => {
          const enabled = Boolean(rules.data.rows.find(row => row.event === key)?.enabled);
          return <button key={key} type="button" aria-current={event === key} onClick={() => {setEvent(key); save.reset();}}
            className={`flex w-full items-center justify-between gap-2 border-l-[3px] px-4 py-2.5 text-left text-sm ${event === key
              ? "border-primary bg-white/80 font-semibold shadow-sm" : "border-transparent text-foreground/80 hover:bg-white/50"}`}>
            {name}<span className={`text-[11px] font-medium ${enabled ? "text-emerald-700" : "text-muted-foreground"}`}>{enabled ? "Ativa" : "Inativa"}</span>
          </button>;
        })}
      </nav>
      <form key={event + String(selected?.template) + String(selected?.enabled) + String(selected?.days)} className="space-y-4 p-5"
        onSubmit={e => {e.preventDefault(); save.mutate(new FormData(e.currentTarget));}}>
        <h2 className="text-sm font-semibold">{automationNames[event]}</h2>
        {event === "released" && <p className="text-xs text-muted-foreground">No SAT o crédito fica disponível assim que a venda é registrada, então este evento dispara junto com "Cashback gerado". Ative apenas um dos dois.</p>}
        {(event === "expiring" || event === "inactive") && <Field label={event === "expiring" ? "Dias de antecedência" : "Dias sem comprar"} className="max-w-xs">
          <Input name="days" type="number" min="1" max="3650" required defaultValue={selected?.days ?? 7} />
        </Field>}
        <Field label="Mensagem"><textarea name="template" className="sat-textarea"
          maxLength={2000} rows={6} required defaultValue={String(selected?.template ?? "")} /></Field>
        <Variables />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <Check name="enabled" label="Ativar automação" defaultChecked={Boolean(selected?.enabled)} />
          <Button type="submit" disabled={save.isPending}>Salvar automação</Button>
        </div>
        {save.isSuccess && <Done>Automação atualizada.</Done>}
      </form>
    </section>}
  </Screen>;
}
