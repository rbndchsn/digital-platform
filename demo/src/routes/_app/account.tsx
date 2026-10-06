import { createFileRoute } from '@tanstack/react-router'
import { Fingerprint, KeyRound, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { ShowDontDoDialog } from '@/components/show-dont-do'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/misc'
import { useMe } from '@/lib/auth'
import { roleLabel } from '@/lib/format'

export const Route = createFileRoute('/_app/account')({
  component: Account,
})

function Account() {
  const me = useMe()
  const [passkey, setPasskey] = useState(false)
  const [digest, setDigest] = useState(true)
  return (
    <>
      <PageHeader title="Account and security" description="Your profile, sign-in methods and notification preferences." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profile" />
          <CardContent className="space-y-3">
            <Field label="Name">
              <Input defaultValue={me.user.name} />
            </Field>
            <Field label="E-mail">
              <Input defaultValue={me.user.email} readOnly />
            </Field>
            <Field label="Job title">
              <Input defaultValue={me.user.jobTitle} />
            </Field>
            <div className="text-fg-muted text-xs">
              Role in {me.org.name}: <Badge tone="outline">{me.role ? roleLabel(me.role) : '—'}</Badge>
            </div>
            <Button onClick={() => toast.success('Profile saved.')}>Save</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Sign-in methods" description="MFA is mandatory for verifier roles and client admins." />
          <CardContent className="space-y-3">
            <div className="border-border flex items-center gap-3 rounded-md border px-3 py-2">
              <ShieldCheck className="text-success size-4" />
              <div className="flex-1 text-sm">
                <div className="font-medium">Authenticator app (TOTP)</div>
                <div className="text-fg-subtle text-xs">Enabled · recovery codes generated</div>
              </div>
              <Badge tone="success">On</Badge>
            </div>
            <div className="border-border flex items-center gap-3 rounded-md border px-3 py-2">
              <Fingerprint className="size-4" />
              <div className="flex-1 text-sm">
                <div className="font-medium">Passkey</div>
                <div className="text-fg-subtle text-xs">Sign in with Touch ID, Windows Hello or a security key</div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setPasskey(true)}>
                Add passkey
              </Button>
            </div>
            <div className="border-border flex items-center gap-3 rounded-md border px-3 py-2">
              <KeyRound className="size-4" />
              <div className="flex-1 text-sm">
                <div className="font-medium">Password</div>
                <div className="text-fg-subtle text-xs">Last changed 41 days ago</div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => toast.message('A password reset link would be e-mailed to you.')}>
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Notifications" description="Blocking items are always sent immediately." />
          <CardContent className="space-y-2 text-sm">
            <label className="flex items-center justify-between">
              <span>Daily digest of non-blocking updates</span>
              <Switch checked={digest} onCheckedChange={setDigest} />
            </label>
            <label className="flex items-center justify-between">
              <span>E-mail me when a finding is raised</span>
              <Switch defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span>E-mail me when an opinion is issued</span>
              <Switch defaultChecked />
            </label>
          </CardContent>
        </Card>
      </div>
      <ShowDontDoDialog
        open={passkey}
        onOpenChange={setPasskey}
        title="Add a passkey"
        description="Your browser would now ask you to confirm with Touch ID, Windows Hello or a security key."
        wouldDo={['Start a WebAuthn registration ceremony in your browser', 'Store the public key against your account', 'Let you sign in without a password next time']}
        simulateLabel="Simulate passkey"
        onSimulate={() => toast.success('Passkey registered (simulated).')}
      >
        <div className="border-border flex items-center justify-center rounded-md border border-dashed p-8">
          <Fingerprint className="text-fg-subtle size-12" />
        </div>
      </ShowDontDoDialog>
    </>
  )
}
