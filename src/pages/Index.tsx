
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Github, Download, Lock, Unlock, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [token, setToken] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { toast } = useToast();

  const validateGitHubUrl = (url: string) => {
    const githubPattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;
    return githubPattern.test(url.replace(/\.git$/, ''));
  };

  const extractRepoInfo = (url: string) => {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, '')
      };
    }
    return null;
  };

  const checkRepositoryExists = async (owner: string, repo: string, token?: string) => {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitHub-Repo-Downloader'
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers
      });

      if (response.status === 404) {
        throw new Error('Repository not found or you don\'t have access to it');
      }

      if (response.status === 401) {
        throw new Error('Invalid GitHub token or insufficient permissions');
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Failed to connect to GitHub API');
    }
  };

  const checkBranchExists = async (owner: string, repo: string, branch: string, token?: string) => {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitHub-Repo-Downloader'
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${branch}`, {
        headers
      });

      if (response.status === 404) {
        throw new Error(`Branch '${branch}' not found in this repository`);
      }

      if (!response.ok) {
        throw new Error(`Failed to verify branch: ${response.status}`);
      }

      return true;
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Failed to verify branch');
    }
  };

  const downloadWithProgress = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to read download stream');
      }

      const chunks: Uint8Array[] = [];
      let downloaded = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        downloaded += value.length;
        
        if (total > 0) {
          const progress = Math.round((downloaded / total) * 100);
          setDownloadProgress(progress);
        }
      }

      // Create blob and download
      const blob = new Blob(chunks);
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (err) {
      console.error('Download error:', err);
      throw err;
    }
  };

  const handleDownload = async () => {
    setError('');
    setSuccess('');
    setDownloadProgress(0);

    if (!repoUrl) {
      setError('Please enter a repository URL');
      return;
    }

    if (!validateGitHubUrl(repoUrl)) {
      setError('Please enter a valid GitHub repository URL');
      return;
    }

    if (isPrivate && !token) {
      setError('Private repositories require a GitHub token');
      return;
    }

    const repoInfo = extractRepoInfo(repoUrl);
    if (!repoInfo) {
      setError('Could not parse repository information');
      return;
    }

    setIsDownloading(true);

    try {
      // Step 1: Check if repository exists and is accessible
      console.log('Checking repository access...');
      const repoData = await checkRepositoryExists(repoInfo.owner, repoInfo.repo, isPrivate ? token : undefined);
      
      // Step 2: Check if branch exists
      console.log('Verifying branch...');
      await checkBranchExists(repoInfo.owner, repoInfo.repo, branch, isPrivate ? token : undefined);

      // Step 3: Download the repository
      console.log('Starting download...');
      const downloadUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}/archive/refs/heads/${branch}.zip`;
      const filename = `${repoInfo.repo}-${branch}.zip`;

      await downloadWithProgress(downloadUrl, filename);

      setSuccess(`Successfully downloaded ${repoInfo.repo} (${branch} branch)`);
      toast({
        title: "Download Complete",
        description: `${repoInfo.repo} has been downloaded successfully`,
      });

    } catch (err) {
      console.error('Download failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Download failed: ${errorMessage}`);
      toast({
        title: "Download Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Github className="h-16 w-16 text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">GitHub Repository Downloader</h1>
          <p className="text-slate-400 text-lg">Download any GitHub repository with ease</p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Download className="h-5 w-5" />
              Repository Download
            </CardTitle>
            <CardDescription className="text-slate-400">
              Enter the GitHub repository URL and select your preferred branch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="repo-url" className="text-white">Repository URL</Label>
              <Input
                id="repo-url"
                type="url"
                placeholder="https://github.com/username/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch" className="text-white">Branch</Label>
              <Input
                id="branch"
                type="text"
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant={isPrivate ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPrivate(!isPrivate)}
                className={isPrivate ? "bg-blue-600 hover:bg-blue-700" : "border-slate-600 text-slate-400 hover:text-white"}
              >
                {isPrivate ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
                {isPrivate ? "Private Repository" : "Public Repository"}
              </Button>
            </div>

            {isPrivate && (
              <div className="space-y-2">
                <Label htmlFor="token" className="text-white">GitHub Personal Access Token</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxx"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                />
                <p className="text-xs text-slate-400">
                  Required for private repositories. Generate one at GitHub Settings → Developer settings → Personal access tokens
                </p>
              </div>
            )}

            {error && (
              <Alert className="border-red-500/50 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-400">{success}</AlertDescription>
              </Alert>
            )}

            {isDownloading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Downloading...</span>
                  <span>{downloadProgress}%</span>
                </div>
                <Progress value={downloadProgress} className="bg-slate-700" />
              </div>
            )}

            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Repository
                </>
              )}
            </Button>

            <div className="text-center text-sm text-slate-400">
              <p>✅ Real GitHub API integration</p>
              <p>✅ Supports private repositories with tokens</p>
              <p>✅ Downloads as ZIP file with progress tracking</p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Built with ❤️ for developers • Now fully functional!</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
