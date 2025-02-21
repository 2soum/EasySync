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
import { Loader2, ExternalLink } from "lucide-react";

interface ShopSyncDialogProps {
  products: any[];
}

export function ShopSyncDialog({ products, buttonLabel = "Sync to Shop" }: { products: any[], buttonLabel?: string }) {
    const [shopUrl, setShopUrl] = useState('');
    const [accessToken, setAccessToken] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
  
    const handleSync = async () => {
      if (!shopUrl || !accessToken) {
        setError('Please fill in all fields');
        return;
      }
  
      setIsLoading(true);
      setError('');
      setSuccess('');
  
      try {
        const response = await fetch('/api/products/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shopUrl,
            accessToken,
            products
          }),
        });
  
        const data = await response.json();
  
        if (!response.ok) {
          throw new Error(data.error || 'Failed to sync products');
        }
  
        setSuccess(data.message);
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
          
          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg mb-4 text-sm">
            <h3 className="font-medium mb-2 text-blue-800">Comment obtenir votre Access Token :</h3>
            <ol className="list-decimal pl-4 space-y-2 text-blue-700">
              <li>Allez dans les paramètres de votre boutique Shopify</li>
              <li>Cliquez sur &quot;Apps et canaux de vente&quot;</li>
              <li>En bas, cliquez sur &quot;Développer des apps&quot;</li>
              <li>Créez une nouvelle app</li>
              <li>Dans &quot;Configuration API&quot;, activez uniquement :
                <ul className="list-disc pl-4 mt-1 text-blue-600">
                  <li>write_products</li>
                </ul>
              </li>
              <li>Dans &quot;Clés API&quot;, installez l&apos;app et copiez le &quot;Admin Access Token&quot;</li>
            </ol>
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
              <p className="font-medium">⚠️ Important :</p>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Le token n&apos;est affiché qu&apos;une seule fois lors de sa création</li>
                <li>Il doit commencer par &quot;shpat_&quot;</li>
                <li>Si vous le perdez, vous devrez en générer un nouveau</li>
              </ul>
            </div>
          </div>

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
              <Label htmlFor="accessToken">Admin Access Token</Label>
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