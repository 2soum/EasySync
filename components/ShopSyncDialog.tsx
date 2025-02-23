// ShopSyncDialog.tsx
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress"; // Add Progress component

interface ShopSyncDialogProps {
  products: any[];
  buttonLabel?: string;
}

export function ShopSyncDialog({ products, buttonLabel = "Sync to Shop" }: ShopSyncDialogProps) {
  const [shopUrl, setShopUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [progress, setProgress] = useState(0);
  
  const BATCH_SIZE = 5; // Number of products to process in parallel
  
  const handleSync = async () => {
    if (!shopUrl || !accessToken) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');
    setProgress(0);

    try {
      // Split products into batches
      const batches = [];
      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        batches.push(products.slice(i, i + BATCH_SIZE));
      }

      let successfulSyncs = 0;
      
      // Process batches sequentially, but products within batch in parallel
      for (const batch of batches) {
        const batchPromises = batch.map(product =>
          fetch('/api/products/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              shopUrl,
              accessToken,
              products: [product] // Send single product
            }),
          }).then(async (response) => {
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.error || 'Failed to sync product');
            }
            return data;
          })
        );

        // Wait for current batch to complete
        const results = await Promise.allSettled(batchPromises);
        
        // Count successful syncs and update progress
        results.forEach(result => {
          if (result.status === 'fulfilled') {
            successfulSyncs++;
          }
        });
        
        setProgress((successfulSyncs / products.length) * 100);
      }

      setSuccess(`${successfulSyncs} out of ${products.length} products synced successfully`);
      setShopUrl('');
      setAccessToken('');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sync Products to Shop</DialogTitle>
        </DialogHeader>
        
        {/* Instructions section remains the same */}
        
        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-500 px-4 py-3 rounded">
              {success}
            </div>
          )}
          {isLoading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-gray-500 text-center">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="shopUrl">Shop URL</Label>
            <Input
              id="shopUrl"
              placeholder="your-store.myshopify.com"
              value={shopUrl}
              onChange={(e) => setShopUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessToken">Access Token</Label>
            <Input
              id="accessToken"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSync}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              'Sync Products'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

