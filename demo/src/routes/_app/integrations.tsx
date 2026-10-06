/** Integrations hub: API keys, MCP, webhooks and import, all in preview (plan_v1 step 4/12). */
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Bot, FileSpreadsheet, KeyRound, Webhook } from 'lucide-react'
import { features } from '@/api'
import { PageHeader } from '@/components/page-header'
import { InterestButton, PreviewOverlay } from '@/components/preview-overlay'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_app/integrations')({
  component: Integrations,
})

function Integrations() {
  const flags = useQuery({ queryKey: ['features'], queryFn: features.list })
  const later = flags.data?.filter((f) => f.area === 'integrations' && f.horizon === 'later') ?? []
  return (
    <>
      <PageHeader title="Integrations" description="Connect your own systems to VERIFASSUR_X. Everything on this page is visible now and switched on when the market is ready; tell us if you want it sooner." />
      <div className="grid gap-5 lg:grid-cols-2">
        <PreviewOverlay flagKey="api">
          <Card>
            <CardHeader title={<span className="inline-flex items-center gap-2"><KeyRound className="size-4" /> API keys</span>} description="Per-organisation keys with read, write and submit scopes." actions={<Button size="sm">Create key</Button>} />
            <CardContent>
              <div className="border-border divide-border divide-y rounded-md border text-sm">
                {[
                  ['Carbon accounting sync', 'vx_live_4f9a…c21e', 'read, write', 'Used 2 h ago'],
                  ['Board reporting', 'vx_live_8b10…77da', 'read', 'Used 3 d ago'],
                ].map(([name, key, scopes, used]) => (
                  <div key={key} className="flex items-center gap-3 px-3 py-2">
                    <span className="flex-1 font-medium">{name}</span>
                    <code className="text-fg-muted text-xs">{key}</code>
                    <Badge tone="outline">{scopes}</Badge>
                    <span className="text-fg-subtle text-xs">{used}</span>
                  </div>
                ))}
              </div>
              <p className="text-fg-subtle mt-3 text-xs">OpenAPI 3.1 specification at /api/v1/openapi.json · same schemas as the forms in this portal.</p>
            </CardContent>
          </Card>
        </PreviewOverlay>

        <PreviewOverlay flagKey="mcp">
          <Card>
            <CardHeader title={<span className="inline-flex items-center gap-2"><Bot className="size-4" /> MCP server</span>} description="Let your carbon-accounting software or an AI agent act on your behalf." actions={<Button size="sm" variant="secondary">Connection details</Button>} />
            <CardContent>
              <div className="bg-surface-muted rounded-md p-3 font-mono text-xs">
                <div className="text-fg-subtle"># tools exposed to your agent</div>
                {['create_verification_request', 'submit_inventory', 'submit_decarb_unit_record', 'upload_evidence', 'list_findings', 'respond_to_finding', 'get_opinion'].map((t) => (
                  <div key={t} className="text-fg">
                    {t}
                  </div>
                ))}
              </div>
              <p className="text-fg-subtle mt-3 text-xs">Every call is logged as a submission with source "mcp" and shows in the Service Log.</p>
            </CardContent>
          </Card>
        </PreviewOverlay>

        <PreviewOverlay flagKey="webhooks">
          <Card>
            <CardHeader title={<span className="inline-flex items-center gap-2"><Webhook className="size-4" /> Webhooks</span>} description="Receive service status, finding and opinion events." actions={<Button size="sm">Add endpoint</Button>} />
            <CardContent>
              <div className="flex gap-2">
                <Input placeholder="https://example.com/hooks/verifassur" />
                <Button variant="secondary">Test</Button>
              </div>
              <div className="text-fg-muted mt-3 flex flex-wrap gap-1.5 text-xs">
                {['service.status_changed', 'finding.raised', 'finding.closed', 'opinion.issued', 'document.rejected'].map((e) => (
                  <Badge key={e} tone="outline">
                    {e}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </PreviewOverlay>

        <PreviewOverlay flagKey="spreadsheet_import">
          <Card>
            <CardHeader title={<span className="inline-flex items-center gap-2"><FileSpreadsheet className="size-4" /> Spreadsheet import</span>} description="Import inventories and decarb_unit records from the VERIFASSUR_X template." actions={<Button size="sm" variant="secondary">Download template</Button>} />
            <CardContent>
              <div className="border-border text-fg-muted rounded-md border border-dashed p-6 text-center text-sm">Drop an .xlsx or .csv here</div>
            </CardContent>
          </Card>
        </PreviewOverlay>
      </div>

      {later.length ? (
        <section className="mt-8">
          <h2 className="text-fg mb-3 text-base font-semibold">Further out</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {later.map((f) => (
              <Card key={f.key} className="flex flex-col">
                <CardHeader title={f.title} description={f.description} actions={<Badge tone="primary">Coming later</Badge>} />
                <CardContent className="mt-auto">
                  <InterestButton flagKey={f.key} size="sm" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </>
  )
}
