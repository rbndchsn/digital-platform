import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { staff } from '@/api'
import { PageHeader } from '@/components/page-header'
import { ShowDontDoDialog } from '@/components/show-dont-do'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input, NativeSelect } from '@/components/ui/input'
import { Avatar } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { useMe } from '@/lib/auth'
import { roleLabel } from '@/lib/format'

export const Route = createFileRoute('/_app/organisation')({
  component: Organisation,
})

function Organisation() {
  const me = useMe()
  const users = useQuery({ queryKey: ['orgUsers', me.org.id], queryFn: () => staff.orgUsers(me.org.id) })
  const [invite, setInvite] = useState(false)
  return (
    <>
      <PageHeader title={me.org.name} description={`Members of your organisation and their roles. Country: ${me.org.country}.`} actions={<Button onClick={() => setInvite(true)}><UserPlus /> Invite member</Button>} />
      <Card>
        <Table>
          <THead>
            <tr>
              <TH>Member</TH>
              <TH>Role</TH>
              <TH>MFA</TH>
              <TH>Status</TH>
            </tr>
          </THead>
          <TBody>
            {users.data?.map((u) => (
              <TR key={u.id}>
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} />
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-fg-subtle text-xs">
                        {u.jobTitle} · {u.email}
                      </div>
                    </div>
                  </div>
                </TD>
                <TD>
                  <Badge tone="outline">{roleLabel(u.role)}</Badge>
                </TD>
                <TD>
                  <Badge tone="success">Enabled</Badge>
                </TD>
                <TD>
                  <Badge tone="neutral">Active</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
      <ShowDontDoDialog
        open={invite}
        onOpenChange={setInvite}
        title="Invite a member"
        description="Invitations are single-use and expire after 7 days."
        wouldDo={['E-mail a single-use invitation link', 'Create the membership with the chosen role once accepted', 'Record the invitation in the audit log']}
        simulateLabel="Send invitation"
        onSimulate={() => toast.success('Invitation sent (simulated).')}
      >
        <div className="space-y-3">
          <Field label="Work e-mail" required>
            <Input placeholder="colleague@company.com" />
          </Field>
          <Field label="Role" required>
            <NativeSelect defaultValue="client_contributor">
              <option value="client_admin">Admin</option>
              <option value="client_contributor">Contributor</option>
              <option value="client_viewer">Viewer</option>
            </NativeSelect>
          </Field>
        </div>
      </ShowDontDoDialog>
    </>
  )
}
