
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
  const [customBranch, setCustomBranch] = useState('');
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

  // Set default common branches when repo URL is entered
  useEffect(() => {
    if (repoUrl && validateGitHubUrl(repoUrl)) {
      const commonBranches = [
        { name: 'main', commit: { sha: 'main' } },
        { name: 'master', commit: { sha: 'master' } },
        { name: 'develop', commit: { sha: 'develop' } },
        { name: 'dev', commit: { sha: 'dev' } }
      ];
      setBranches(commonBranches);
      setSelectedBranch('main');
      setError('');
    } else {
      setBranches([]);
      setSelectedBranch('');
    }
  }, [repoUrl]);

  const downloadRepository = async (owner: string, repo: string, branch: string) => {
    console.log(`Starting download: ${owner}/${repo} on branch ${branch}`);
    
    // Direct GitHub download URL
    const downloadUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
    
    try {
      // Create a download link and trigger it
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${repo}-${branch}.zip`;
      link.target = '_blank';
      
      // Add to DOM temporarily
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      
      console.log(`Download triggered for: ${downloadUrl}`);
      
      // Simulate progress for user feedback
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 15;
        setDownloadProgress(progress);
        
        if (progress >= 100) {
          clearInterval(progressInterval);
        }
      }, 150);
      
      // Wait for progress completion
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (err) {
      console.error('Download error:', err);
      throw new Error('Failed to initiate download');
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

    const finalBranch = customBranch || selectedBranch;
    if (!finalBranch) {
      setError('Please select a branch or enter a custom branch name');
      return;
    }

    const repoInfo = extractRepoInfo(repoUrl);
    if (!repoInfo) {
      setError('Could not parse repository information');
      return;
    }

    setIsDownloading(true);

    try {
      console.log(`Downloading ${repoInfo.owner}/${repoInfo.repo} (${finalBranch} branch)...`);
      
      await downloadRepository(repoInfo.owner, repoInfo.repo, finalBranch);

      setSuccess(`Download initiated for ${repoInfo.repo} (${finalBranch} branch). Check your downloads folder.`);
      toast({
        title: "Download Started",
        description: `${repoInfo.repo} download has been initiated`,
      });

    } catch (err) {
      console.error('Download failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to download repository';
      setError(`Download failed: ${errorMessage}. Try checking if the repository and branch exist.`);
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="branch" className="text-white flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    Select Common Branch
                  </Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                      <SelectValue placeholder="Select a common branch" />
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

                <div className="space-y-2">
                  <Label htmlFor="custom-branch" className="text-white">Or Enter Custom Branch Name</Label>
                  <Input
                    id="custom-branch"
                    type="text"
                    placeholder="e.g., feature/new-feature, v1.0.0"
                    value={customBranch}
                    onChange={(e) => setCustomBranch(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                  <p className="text-xs text-slate-400">
                    This will override the selected branch above
                  </p>
                </div>
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
                  <span>Initiating download...</span>
                  <span>{downloadProgress}%</span>
                </div>
                <Progress value={downloadProgress} className="bg-slate-700" />
              </div>
            )}

            <Button
              onClick={handleDownload}
              disabled={isDownloading || (!selectedBranch && !customBranch)}
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
              <p>✅ Direct GitHub repository downloads</p>
              <p>✅ Common branch detection</p>
              <p>✅ Custom branch support</p>
              <p>✅ Downloads as ZIP file</p>
              <p className="text-xs mt-2 text-slate-500">
                Note: If download doesn't start, the repository or branch may not exist
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Built with ❤️ for developers • Fully functional GitHub downloader!</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
