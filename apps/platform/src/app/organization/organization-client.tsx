"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createOrganization,
  setActiveOrganization,
  deleteOrganization,
  inviteMember,
  removeMember,
  updateMemberRole,
  listMembers,
  listInvitations,
} from "./actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Plus,
  Users,
  Mail,
  Settings,
  Trash2,
  AlertCircle,
  Check,
  Loader2,
  UserPlus,
  Crown,
  Shield,
  User,
  X,
  ExternalLink,
} from "lucide-react";

interface OrganizationClientProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
    createdAt: Date;
  }>;
  activeOrganization: {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
  } | null;
}

export function OrganizationClient({ user, organizations, activeOrganization }: OrganizationClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(activeOrganization?.id || "");

  // Form states
  const [newOrgData, setNewOrgData] = useState({
    name: "",
    slug: "",
  });

  const [inviteData, setInviteData] = useState<{
    email: string;
    role: "member" | "admin" | "owner";
  }>({
    email: "",
    role: "member",
  });

  // Members and invitations state
  const [members, setMembers] = useState<Array<{
    id: string;
    userId: string;
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    role: string;
    createdAt: Date;
  }>>([]);

  const [invitations, setInvitations] = useState<Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: Date;
  }>>([]);

  // Load members and invitations when selected org changes
  useEffect(() => {
    if (selectedOrg) {
      loadMembersAndInvitations();
    }
  }, [selectedOrg]);

  const loadMembersAndInvitations = async () => {
    if (!selectedOrg) return;

    // Load members
    const membersResult = await listMembers({ organizationId: selectedOrg });
    if (membersResult.data && !membersResult.error && !Array.isArray(membersResult.data)) {
      setMembers(membersResult.data.members || []);
    }

    // Load invitations
    const invitationsResult = await listInvitations(selectedOrg);
    if (invitationsResult.data && !invitationsResult.error) {
      setInvitations(invitationsResult.data);
    }
  };

  const handleCreateOrganization = async () => {
    setLoading("create");
    setMessage(null);

    const result = await createOrganization({
      name: newOrgData.name,
      slug: newOrgData.slug,
    });

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Organization created successfully!" });
      setShowCreateDialog(false);
      setNewOrgData({ name: "", slug: "" });
      router.refresh();
    }

    setLoading(null);
  };

  const handleSetActiveOrganization = async (orgId: string) => {
    setLoading("setActive");
    setMessage(null);

    const result = await setActiveOrganization(orgId);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setSelectedOrg(orgId);
      setMessage({ type: "success", text: "Active organization changed!" });
      router.refresh();
    }

    setLoading(null);
  };

  const handleInviteMember = async () => {
    setLoading("invite");
    setMessage(null);

    const result = await inviteMember({
      email: inviteData.email,
      role: inviteData.role,
      organizationId: selectedOrg,
    });

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: `Invitation sent to ${inviteData.email}!` });
      setShowInviteDialog(false);
      setInviteData({ email: "", role: "member" });
      await loadMembersAndInvitations();
    }

    setLoading(null);
  };

  const handleRemoveMember = async (memberIdOrEmail: string) => {
    if (!confirm("Are you sure you want to remove this member?")) {
      return;
    }

    setLoading(`remove-${memberIdOrEmail}`);
    setMessage(null);

    const result = await removeMember({
      memberIdOrEmail,
      organizationId: selectedOrg,
    });

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Member removed successfully!" });
      await loadMembersAndInvitations();
    }

    setLoading(null);
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    setLoading(`role-${memberId}`);
    setMessage(null);

    const result = await updateMemberRole({
      memberId,
      role: newRole,
      organizationId: selectedOrg,
    });

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Role updated successfully!" });
      await loadMembersAndInvitations();
    }

    setLoading(null);
  };

  const handleDeleteOrganization = async (orgId: string) => {
    if (!confirm("Are you sure you want to delete this organization? This action cannot be undone.")) {
      return;
    }

    setLoading(`delete-${orgId}`);

    const result = await deleteOrganization(orgId);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Organization deleted successfully!" });
      router.refresh();
    }

    setLoading(null);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4" />;
      case "admin":
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            Manage your organizations and team members
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Organization</DialogTitle>
              <DialogDescription>
                Create a new organization to collaborate with your team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={newOrgData.name}
                  onChange={(e) => setNewOrgData({ ...newOrgData, name: e.target.value })}
                  placeholder="Acme Inc"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">Organization Slug</Label>
                <Input
                  id="org-slug"
                  value={newOrgData.slug}
                  onChange={(e) => setNewOrgData({ ...newOrgData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="acme-inc"
                />
                <p className="text-xs text-muted-foreground">
                  This will be used in URLs and must be unique
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateOrganization}
                disabled={loading === "create" || !newOrgData.name || !newOrgData.slug}
              >
                {loading === "create" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Organization"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          {message.type === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Organization Selector */}
      {organizations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Organization</CardTitle>
            <CardDescription>
              Select which organization you're currently working in
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Select
                value={selectedOrg}
                onValueChange={handleSetActiveOrganization}
                disabled={loading === "setActive"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4" />
                        <span>{org.name}</span>
                        <span className="text-muted-foreground">({org.slug})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loading === "setActive" && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizations List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Your Organizations</h2>
        {organizations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                You're not part of any organizations yet.
                <br />
                Create one to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {organizations.map((org) => (
              <Card key={org.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-10 w-10">
                        {org.logo && <AvatarImage src={org.logo} />}
                        <AvatarFallback>
                          {org.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{org.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">@{org.slug}</p>
                      </div>
                    </div>
                    {org.id === selectedOrg && (
                      <Badge variant="default">Active</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Created {new Date(org.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/organization/${org.slug}`)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Manage
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteOrganization(org.id)}
                    disabled={loading === `delete-${org.id}`}
                  >
                    {loading === `delete-${org.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Members Management */}
      {selectedOrg && (
        <Tabs defaultValue="members" className="space-y-4">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Team Members</h3>
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to add someone to your organization
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email Address</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        value={inviteData.email}
                        onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                        placeholder="colleague@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invite-role">Role</Label>
                      <Select
                        value={inviteData.role}
                        onValueChange={(value: "member" | "admin" | "owner") => setInviteData({ ...inviteData, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleInviteMember}
                      disabled={loading === "invite" || !inviteData.email}
                    >
                      {loading === "invite" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Invitation"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          {member.user.image && <AvatarImage src={member.user.image} />}
                          <AvatarFallback>
                            {member.user.name?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.user.name}</p>
                          <p className="text-sm text-muted-foreground">{member.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {getRoleIcon(member.role)}
                          <span className="ml-1">{member.role}</span>
                        </Badge>
                        {member.role !== "owner" && member.userId !== user.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={loading === `remove-${member.id}`}
                          >
                            {loading === `remove-${member.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <h3 className="text-lg font-semibold">Pending Invitations</h3>
            {invitations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    No pending invitations
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {invitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center space-x-3">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{invitation.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">{invitation.role}</Badge>
                          <Badge variant="outline">{invitation.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}