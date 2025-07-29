import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Grid3X3, FileSpreadsheet, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              StudyFlow
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Welcome back, {user?.firstName || user?.email || 'Student'}!
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/api/logout'}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </header>

        {/* Workspace Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Document Workspace */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-blue-300">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl">Document Workspace</CardTitle>
              <CardDescription>
                Rich text editing with LaTeX support and AI assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/document/new">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Create Document
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Cheat Sheet Workspace */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-green-300">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <Grid3X3 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-xl">Cheat Sheet</CardTitle>
              <CardDescription>
                Dynamic boxes with LaTeX formulas and drag-and-drop
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/cheatsheet/new">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Create Cheat Sheet
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Template Workspace */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-purple-300">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4">
                <FileSpreadsheet className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-xl">Template Workspace</CardTitle>
              <CardDescription>
                Pre-designed templates for different academic subjects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/template/new">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Create Template
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-8">
            Why StudyFlow?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-blue-600 dark:text-blue-400 text-4xl mb-4">🎯</div>
              <h3 className="font-semibold mb-2">AI-Powered</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                ChatGPT integration for instant help with math, writing, and research
              </p>
            </div>
            <div className="text-center">
              <div className="text-green-600 dark:text-green-400 text-4xl mb-4">📝</div>
              <h3 className="font-semibold mb-2">LaTeX Support</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Beautiful mathematical notation rendering across all workspaces
              </p>
            </div>
            <div className="text-center">
              <div className="text-purple-600 dark:text-purple-400 text-4xl mb-4">🔒</div>
              <h3 className="font-semibold mb-2">Private & Secure</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Your work is private and secure with user authentication
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}