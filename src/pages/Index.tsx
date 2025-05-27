
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Github, Download, Lock, Unlock, AlertCircle, CheckCircle, GitBranch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Branch {
  name: string;
  commit: {
    sha: string;
  };
}

const Index = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [token, setToken] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
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

  const fetchBranches = async (owner: string, repo: string, token?: string) => {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitHub-Repo-Downloader'
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
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

      const branchesData = await response.json();
      return branchesData;
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Failed to fetch branches');
    }
  };

  const loadBranches = async () => {
    if (!repoUrl || !validateGitHubUrl(repoUrl)) {
      return;
    }

    const repoInfo = extractRepoInfo(repoUrl);
    if (!repoInfo) {
      return;
    }

    setIsLoadingBranches(true);
    setError('');

    try {
      console.log('Fetching branches...');
      const branchesData = await fetchBranches(repoInfo.owner, repoInfo.repo, isPrivate ? token : undefined);
      setBranches(branchesData);
      
      // Set default branch (usually 'main' or 'master')
      const defaultBranch = branchesData.find((b: Branch) => b.name === 'main') || 
                           branchesData.find((b: Branch) => b.name === 'master') || 
                           branchesData[0];
      
      if (defaultBranch) {
        setSelectedBranch(defaultBranch.name);
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch branches';
      setError(errorMessage);
      setBranches([]);
      setSelectedBranch('');
    } finally {
      setIsLoadingBranches(false);
    }
  };

  // Auto-load branches when repo URL changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (repoUrl && validateGitHubUrl(repoUrl)) {
        loadBranches();
      } else {
        setBranches([]);
        setSelectedBranch('');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [repoUrl, isPrivate, token]);

  const downloadWithAuth = async (owner: string, repo: string, branch: string, token?: string) => {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitHub-Repo-Downloader'
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    try {
      // Get the download URL from GitHub API
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`, {
        headers,
        redirect: 'manual'
      });

      if (response.status === 302) {
        // GitHub returns a redirect to the actual download URL
        const downloadUrl = response.headers.get('location');
        if (!downloadUrl) {
          throw new Error('Failed to get download URL');
        }

        // Download the file from the redirect URL
        const downloadResponse = await fetch(downloadUrl);
        
        if (!downloadResponse.ok) {
          throw new Error(`Download failed: ${downloadResponse.status}`);
        }

        const contentLength = downloadResponse.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        
        const reader = downloadResponse.body?.getReader();
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
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${repo}-${branch}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        window.URL.revokeObjectURL(blobUrl);
        
      } else if (response.status === 404) {
        throw new Error('Repository or branch not found');
      } else if (response.status === 401) {
        throw new Error('Invalid GitHub token or insufficient permissions');
      } else {
        throw new Error(`GitHub API error: ${response.status}`);
      }
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

    if (!selectedBranch) {
      setError('Please select a branch to download');
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
      console.log(`Starting download of ${repoInfo.owner}/${repoInfo.repo} (${selectedBranch} branch)...`);
      
      await downloadWithAuth(repoInfo.owner, repoInfo.repo, selectedBranch, isPrivate ? token : undefined);

      setSuccess(`Successfully downloaded ${repoInfo.repo} (${selectedBranch} branch)`);
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

            {branches.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="branch" className="text-white flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Branch
                </Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {branches.map((branch) => (
                      <SelectItem 
                        key={branch.name} 
                        value={branch.name}
                        className="text-white hover:bg-slate-600"
                      >
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isLoadingBranches && (
              <div className="flex items-center space-x-2 text-slate-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <span>Loading branches...</span>
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
              disabled={isDownloading || !selectedBranch}
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
              <p>✅ Automatic branch detection</p>
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
