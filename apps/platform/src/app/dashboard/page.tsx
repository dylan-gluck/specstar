import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen, Clock, Users, Activity } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const organizations = await auth.api.listOrganizations({
    headers: await headers(),
  });

  // Mock data for projects - in a real app, this would come from your database
  const projects = [
    {
      id: "1",
      name: "E-Commerce Platform",
      description: "Next.js application with Stripe integration",
      status: "active",
      lastUpdated: "2 hours ago",
      members: 5,
    },
    {
      id: "2",
      name: "Mobile App API",
      description: "RESTful API for React Native application",
      status: "active",
      lastUpdated: "1 day ago",
      members: 3,
    },
    {
      id: "3",
      name: "Analytics Dashboard",
      description: "Real-time data visualization platform",
      status: "paused",
      lastUpdated: "3 days ago",
      members: 4,
    },
    {
      id: "4",
      name: "Content Management System",
      description: "Headless CMS with GraphQL API",
      status: "active",
      lastUpdated: "5 days ago",
      members: 2,
    },
  ];

  const stats = [
    {
      title: "Total Projects",
      value: projects.length.toString(),
      icon: FolderOpen,
      description: "Active workspace projects",
    },
    {
      title: "Active Projects",
      value: projects.filter(p => p.status === "active").length.toString(),
      icon: Activity,
      description: "Currently in progress",
    },
    {
      title: "Team Members",
      value: "12",
      icon: Users,
      description: "Across all projects",
    },
    {
      title: "Recent Activity",
      value: "24",
      icon: Clock,
      description: "Updates in last 7 days",
    },
  ];

  return (
    <DashboardLayout
      user={session.user}
      organizations={organizations || []}
      activeOrganizationId={session.session.activeOrganizationId}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {session.user.name}! Here's an overview of your projects.
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Projects Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Your Projects</h2>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge variant={project.status === "active" ? "default" : "secondary"}>
                      {project.status}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>{project.members} members</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{project.lastUpdated}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
