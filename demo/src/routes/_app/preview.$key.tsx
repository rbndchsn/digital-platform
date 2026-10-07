/** Generic preview page for future features (plan_v1 §2.2): a realistic layout, greyed, with interest capture. */
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/page-header'
import { PreviewOverlay, useFeature } from '@/components/preview-overlay'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress, Switch } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'

export const Route = createFileRoute('/_app/preview/$key')({
  component: Preview,
})

function Preview() {
  const { key } = Route.useParams()
  const { flag } = useFeature(key)
  return (
    <>
      <PageHeader crumbs={[{ label: 'Back', to: '/' }]} title={flag?.title ?? key} description={flag?.description} meta={<Badge tone="primary">Coming {flag?.horizon === 'later' ? 'later' : 'next'}</Badge>} actions={<Button variant="ghost" asChild><Link to="/integrations"><ArrowLeft /> Integrations</Link></Button>} />
      <PreviewOverlay flagKey={key}>{MOCKS[key] ?? <GenericMock />}</PreviewOverlay>
    </>
  )
}

const MOCKS: Record<string, ReactNode> = {
  ai_assistant: (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader title="Unassigned uploads" description="The assistant proposes a slot for each file; a human confirms." />
        <CardContent>
          <Table>
            <THead>
              <tr>
                <TH>File</TH>
                <TH>Proposed slot</TH>
                <TH>Confidence</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {[
                ['gas_invoices_Q3_lelystad.pdf', 'Activity data samples', 96],
                ['inventory_v4_final.xlsx', 'GHG inventory workbook', 91],
                ['boundary_memo.docx', 'Inventory methodology', 74],
              ].map(([f, s, c]) => (
                <TR key={String(f)}>
                  <TD>{f}</TD>
                  <TD>{s}</TD>
                  <TD className="w-40">
                    <Progress value={Number(c)} tone={Number(c) > 85 ? 'success' : 'warning'} />
                  </TD>
                  <TD className="text-right">
                    <Button size="sm">Confirm</Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Completeness check" description="Required slots still empty before the desk review." />
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Organisational boundary / entity list</span>
            <Badge tone="warning">Missing</Badge>
          </div>
          <div className="flex justify-between">
            <span>Emission factor sources</span>
            <Badge tone="warning">Missing</Badge>
          </div>
          <div className="text-fg-subtle text-xs">Extracted figures from the workbook: Scope 1 20,244 · Scope 2 16,593 · Scope 3 3,724,509 tCO2e — matches the declared inventory.</div>
        </CardContent>
      </Card>
    </div>
  ),
  esign: (
    <Card>
      <CardHeader title="Qualified e-signature" description="Service agreements and opinions signed with a qualified provider." />
      <CardContent className="space-y-3 text-sm">
        {['Service agreement VX-2026-0031 — awaiting Ingrid Vos', 'Opinion statement VX-2025-0142 — signed by Helena Brandt, Marcus Oyelaran'].map((x) => (
          <div key={x} className="border-border flex items-center justify-between rounded-md border px-3 py-2">
            <span>{x}</span>
            <Button size="sm" variant="secondary">
              Open signing session
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  ),
  reports_export: (
    <div className="grid gap-5 md:grid-cols-2">
      {['ISO 14064-1 GHG report 2025', 'CSRD / ESRS E1 datapoints 2025', 'GHG Protocol corporate inventory 2025'].map((r) => (
        <Card key={r}>
          <CardHeader title={r} description="Generated from verified records with the assurance reference on every figure." actions={<Button size="sm">Generate</Button>} />
        </Card>
      ))}
    </div>
  ),
  registry_links: (
    <Card>
      <CardHeader title="Registry connectors" description="Verra Project Hub and Gold Standard." />
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Project ID (e.g. VCS-4471)" />
          <Button variant="secondary">Connect</Button>
        </div>
        <p className="text-fg-muted text-sm">Monitoring reports are handed to the registry from the platform and issuance is pulled back as verified figures.</p>
      </CardContent>
    </Card>
  ),
  public_complaints: (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader title="File a complaint about VERIFASSUR" description="Public form at /complaints (Release 2, PRD FR-93): any party may complain without an account. Turnstile protects the form; a case token lets you follow the status." />
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Your name" aria-label="Your name" />
            <Input placeholder="E-mail for the acknowledgement" aria-label="E-mail" />
            <Input placeholder="Verification code concerned (optional)" aria-label="Verification code" className="sm:col-span-2" />
          </div>
          <div className="border-border text-fg-subtle rounded-md border border-dashed px-3 py-6 text-center text-sm">Describe what happened, when, and what outcome you ask for.</div>
          <div className="flex items-center justify-between">
            <Badge tone="outline">Turnstile check</Badge>
            <Button>Submit complaint</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="What happens next" />
        <CardContent className="text-fg-muted space-y-2 text-sm">
          <p>Acknowledged within 5 working days; decided within 30, by a manager outside the involved set of any engagement concerned.</p>
          <p>You receive a case token such as <code className="font-mono">CMP-7Q2K-91XA</code> to check the stage online.</p>
          <p>Investigation notes stay internal; you see the stage dates and the outcome summary.</p>
        </CardContent>
      </Card>
    </div>
  ),
  continuous_assurance: (
    <Card>
      <CardHeader title="Continuous assurance" description="Monthly data streams verified on a rolling basis." />
      <CardContent className="space-y-2 text-sm">
        {['January 2026 — 1,642 tCO2e — verified', 'February 2026 — 1,588 tCO2e — verified', 'March 2026 — 1,701 tCO2e — in review'].map((x) => (
          <div key={x} className="border-border flex justify-between rounded-md border px-3 py-2">
            <span>{x}</span>
            <Switch defaultChecked />
          </div>
        ))}
      </CardContent>
    </Card>
  ),
}

function GenericMock() {
  return (
    <Card>
      <CardHeader title="Connected sources" description="Evidence arrives directly from systems." />
      <CardContent className="space-y-2 text-sm">
        {['Smart meters — 3 sites', 'Satellite land-use monitoring', 'Farm management system export'].map((x) => (
          <div key={x} className="border-border flex items-center justify-between rounded-md border px-3 py-2">
            <span>{x}</span>
            <Badge tone="success">Connected</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
