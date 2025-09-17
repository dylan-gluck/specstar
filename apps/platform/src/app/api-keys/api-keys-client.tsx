"use client";

import { useState } from "react";
import { createApiKey, updateApiKey, deleteApiKey, type ApiKey, type ApiKeyWithSecret } from "./actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import {
  Key,
  Plus,
  Trash2,
  AlertCircle,
  Check,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  Settings,
  Info,
  Clock,
  Activity,
  Shield,
} from "lucide-react";

interface ApiKeysClientProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  initialApiKeys: ApiKey[];
}

export function ApiKeysClient({ user, initialApiKeys }: ApiKeysClientProps) {
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialApiKeys);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form state for creating new API key
  const [newKeyData, setNewKeyData] = useState({
    name: "",
    prefix: "sk_",
    expiresIn: "never",
    customExpiresIn: 30,
    rateLimit: true,
    maxRequests: 100,
    metadata: "",
  });

  const handleCreateApiKey = async () => {
    setLoading("create");
    setMessage(null);
    try {
      let expiresIn: number | undefined;
      if (newKeyData.expiresIn !== "never") {
        const days = newKeyData.expiresIn === "custom"
          ? newKeyData.customExpiresIn
          : parseInt(newKeyData.expiresIn);
        expiresIn = days * 24 * 60 * 60; // Convert days to seconds
      }

      const result = await createApiKey({
        name: newKeyData.name || `API Key ${new Date().toLocaleDateString()}`,
        prefix: newKeyData.prefix,
        expiresIn,
        metadata: newKeyData.metadata ? JSON.parse(newKeyData.metadata) : undefined,
        rateLimitEnabled: newKeyData.rateLimit,
        rateLimitMax: newKeyData.maxRequests,
      });

      if (result.success && result.data) {
        const apiKeyData = result.data as ApiKeyWithSecret;
        setNewKey(apiKeyData.key!);
        // Remove the key from the object before adding to the list
        const { key, ...apiKeyWithoutSecret } = apiKeyData;
        setApiKeys([...apiKeys, apiKeyWithoutSecret as ApiKey]);
        setShowCreateDialog(false);
        setShowKeyDialog(true);
        setMessage({ type: "success", text: "API key created successfully!" });
        router.refresh(); // Refresh to update server-rendered data

        // Reset form
        setNewKeyData({
          name: "",
          prefix: "sk_",
          expiresIn: "never",
          customExpiresIn: 30,
          rateLimit: true,
          maxRequests: 100,
          metadata: "",
        });
      } else {
        setMessage({ type: "error", text: result.error || "Failed to create API key." });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to create API key. Please try again." });
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      return;
    }

    setLoading(`delete-${keyId}`);
    setMessage(null);
    try {
      const result = await deleteApiKey(keyId);

      if (result.success) {
        setApiKeys(apiKeys.filter(key => key.id !== keyId));
        setMessage({ type: "success", text: "API key deleted successfully!" });
        router.refresh(); // Refresh to update server-rendered data
      } else {
        setMessage({ type: "error", text: result.error || "Failed to delete API key." });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete API key." });
    } finally {
      setLoading(null);
    }
  };

  const handleUpdateApiKey = async (keyId: string, updates: { enabled?: boolean; name?: string }) => {
    setLoading(`update-${keyId}`);
    setMessage(null);
    try {
      const result = await updateApiKey({
        keyId,
        ...updates,
      });

      if (result.success && result.data) {
        setApiKeys(apiKeys.map(key =>
          key.id === keyId ? { ...key, ...updates } : key
        ));
        setMessage({ type: "success", text: "API key updated successfully!" });
        router.refresh(); // Refresh to update server-rendered data
      } else {
        setMessage({ type: "error", text: result.error || "Failed to update API key." });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update API key." });
    } finally {
      setLoading(null);
    }
  };

  const copyToClipboard = async (text: string, keyId?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (keyId) {
        setCopiedKey(keyId);
        setTimeout(() => setCopiedKey(null), 2000);
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to copy to clipboard." });
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString();
  };

  const isExpired = (expiresAt: Date | null | undefined) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage your API keys for programmatic access
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for accessing your resources
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key Name (Optional)</Label>
                <Input
                  id="key-name"
                  value={newKeyData.name}
                  onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                  placeholder="Production API Key"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="key-prefix">Key Prefix</Label>
                <Input
                  id="key-prefix"
                  value={newKeyData.prefix}
                  onChange={(e) => setNewKeyData({ ...newKeyData, prefix: e.target.value })}
                  placeholder="sk_"
                />
                <p className="text-xs text-muted-foreground">
                  Prefix to identify your key (e.g., sk_ for secret key)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires-in">Expiration</Label>
                <Select
                  value={newKeyData.expiresIn}
                  onValueChange={(value) => setNewKeyData({ ...newKeyData, expiresIn: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newKeyData.expiresIn === "custom" && (
                <div className="space-y-2">
                  <Label htmlFor="custom-expires">Days until expiration</Label>
                  <Input
                    id="custom-expires"
                    type="number"
                    min="1"
                    max="365"
                    value={newKeyData.customExpiresIn}
                    onChange={(e) => setNewKeyData({ ...newKeyData, customExpiresIn: parseInt(e.target.value) })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="metadata">Metadata (JSON, Optional)</Label>
                <Textarea
                  id="metadata"
                  value={newKeyData.metadata}
                  onChange={(e) => setNewKeyData({ ...newKeyData, metadata: e.target.value })}
                  placeholder='{"environment": "production", "version": "v1"}'
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Store additional information with your key
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateApiKey}
                disabled={loading === "create"}
              >
                {loading === "create" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Key"
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

      {/* New Key Display Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your New API Key</DialogTitle>
            <DialogDescription>
              Make sure to copy your API key now. You won't be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This is the only time you'll see this key. Store it securely.
              </AlertDescription>
            </Alert>
            <div className="flex items-center space-x-2">
              <Input
                readOnly
                value={newKey || ""}
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(newKey || "")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setShowKeyDialog(false);
              setNewKey(null);
            }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Keys List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your API Keys</h2>
          <Badge variant="secondary">{apiKeys.length} keys</Badge>
        </div>

        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Key className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                You haven't created any API keys yet.
                <br />
                Create one to get started with API access.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((apiKey) => (
              <Card key={apiKey.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Key className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {apiKey.name || "Unnamed Key"}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          {apiKey.start && (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {apiKey.prefix}{apiKey.start}...
                            </code>
                          )}
                          {isExpired(apiKey.expiresAt) ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : apiKey.enabled ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Disabled</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(apiKey.id, apiKey.id)}
                            >
                              {copiedKey === apiKey.id ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy key ID</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Switch
                        checked={apiKey.enabled}
                        onCheckedChange={(checked) =>
                          handleUpdateApiKey(apiKey.id, { enabled: checked })
                        }
                        disabled={loading === `update-${apiKey.id}` || isExpired(apiKey.expiresAt)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteApiKey(apiKey.id)}
                        disabled={loading === `delete-${apiKey.id}`}
                      >
                        {loading === `delete-${apiKey.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">{formatDate(apiKey.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expires</p>
                      <p className="font-medium">{formatDate(apiKey.expiresAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Used</p>
                      <p className="font-medium">{formatDate(apiKey.lastRequest)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Rate Limit</p>
                      <p className="font-medium">
                        {apiKey.rateLimitEnabled
                          ? `${apiKey.rateLimitMax || 0} requests`
                          : "Disabled"}
                      </p>
                    </div>
                  </div>
                  {apiKey.remaining !== null && apiKey.remaining !== undefined && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Remaining Requests</span>
                        <Badge variant={apiKey.remaining > 0 ? "default" : "destructive"}>
                          {apiKey.remaining} left
                        </Badge>
                      </div>
                    </div>
                  )}
                  {apiKey.metadata && Object.keys(apiKey.metadata).length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Metadata</p>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(apiKey.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* API Key Usage Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>Using Your API Keys</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Authentication</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Include your API key in the request headers:
            </p>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
              <code>{`curl -H "x-api-key: YOUR_API_KEY" \\
  https://api.example.com/endpoint`}</code>
            </pre>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium mb-2">Security Best Practices</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-start">
                <Shield className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
                Never share your API keys or commit them to version control
              </li>
              <li className="flex items-start">
                <Clock className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
                Set expiration dates for temporary keys
              </li>
              <li className="flex items-start">
                <Activity className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
                Monitor your API key usage regularly
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}