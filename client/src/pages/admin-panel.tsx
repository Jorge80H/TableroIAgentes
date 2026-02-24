import { useState } from "react";
import { db } from "@/lib/instant";
import { useCurrentUser } from "@/hooks/use-current-user";
import { id } from "@instantdb/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Plus, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminPanel() {
    const { isSuperAdmin } = useCurrentUser();
    const { toast } = useToast();

    // Queries
    const { data: orgsData } = db.useQuery(isSuperAdmin ? { organizations: { users: {}, agents: {} } } : null);
    const { data: usersData } = db.useQuery(isSuperAdmin ? { $users: {} } : null);

    const organizations = orgsData?.organizations || [];
    const usersList = usersData?.$users || [];

    const [newOrgName, setNewOrgName] = useState("");
    const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);

    // Security check layer
    if (!isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
                <h2 className="text-2xl font-bold">Access Denied</h2>
                <p className="text-muted-foreground mt-2">You must be a Super Admin to view this page.</p>
            </div>
        );
    }

    const handleCreateOrganization = async () => {
        if (!newOrgName.trim()) return;
        try {
            await db.transact([
                db.tx.organizations[id()].update({
                    name: newOrgName,
                    createdAt: Date.now()
                })
            ]);
            toast({ title: "Organization created" });
            setNewOrgName("");
            setIsOrgDialogOpen(false);
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    const handleUpdateUser = async (userId: string, updates: any) => {
        try {
            const txs = [db.tx.$users[userId].update(updates)];

            // If organizationId changes, we also link it properly so relations work if needed
            if (updates.organizationId) {
                txs.push(db.tx.organizations[updates.organizationId].link({ users: userId }));
            }

            await db.transact(txs);
            toast({ title: "User updated successfully" });
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">Super Admin Panel</h1>
                <p className="text-sm text-muted-foreground">Manage organizations, clients, and user roles across the platform.</p>
            </div>

            <Tabs defaultValue="organizations" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="organizations" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Organizations
                    </TabsTrigger>
                    <TabsTrigger value="users" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Users
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="organizations">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Organizations (Clients)</CardTitle>
                                <CardDescription>Logical groups for filtering agents and conversations.</CardDescription>
                            </div>
                            <Dialog open={isOrgDialogOpen} onOpenChange={setIsOrgDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New Organization</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Create Organization</DialogTitle>
                                        <DialogDescription>Add a new client organization. Later you can link agents and users to it.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Organization Name</label>
                                            <Input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder="e.g. Acme Studio" />
                                        </div>
                                        <Button onClick={handleCreateOrganization} className="w-full">Create</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Agents Linked</TableHead>
                                        <TableHead>Users Linked</TableHead>
                                        <TableHead>Created At</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {organizations.map((org: any) => (
                                        <TableRow key={org.id}>
                                            <TableCell className="font-medium">{org.name}</TableCell>
                                            <TableCell>{org.agents?.length || 0}</TableCell>
                                            <TableCell>{org.users?.length || 0}</TableCell>
                                            <TableCell>{org.createdAt ? new Date(org.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                                        </TableRow>
                                    ))}
                                    {organizations.length === 0 && (
                                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No organizations found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle>Platform Users</CardTitle>
                            <CardDescription>Assign roles and organizations to registered users.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Organization</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {usersList.map((usr: any) => (
                                        <TableRow key={usr.id}>
                                            <TableCell>{usr.email}</TableCell>
                                            <TableCell>
                                                <Select
                                                    defaultValue={usr.role || "AGENT"}
                                                    onValueChange={(val) => handleUpdateUser(usr.id, { role: val })}
                                                >
                                                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                                        <SelectItem value="AGENT">Agent</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    defaultValue={usr.organizationId || "none"}
                                                    onValueChange={(val) => handleUpdateUser(usr.id, { organizationId: val === "none" ? null : val })}
                                                >
                                                    <SelectTrigger className="w-48"><SelectValue placeholder="No Org" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">-- None --</SelectItem>
                                                        {organizations.map((o: any) => (
                                                            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
}
