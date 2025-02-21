"use client"
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download, Search, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShopSyncDialog } from '@/components/ShopSyncDialog';
import { Checkbox } from "@/components/ui/checkbox";

interface Product {
  id: string;
  title: string;
  price: number;
  image: string;
}

export default function Home() {
  const [shopUrl, setShopUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setIsLoading(true);
    setError('');
    setSelectedProducts([]); // Clear selection when searching
    
    try {
      let fetchUrl = shopUrl;
      if (!shopUrl.endsWith('/products.json')) {
        fetchUrl = shopUrl.endsWith('/') ? `${shopUrl}products.json` : `${shopUrl}/products.json`;
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error('Unable to fetch products. Please check the URL and try again.');
      }
      
      const data = await response.json();
      const formattedProducts: Product[] = data.products.map((p: any) => ({
        id: p.id.toString(),
        title: p.title,
        price: parseFloat(p.variants[0]?.price || '0'),
        image: p.images[0]?.src || '',
      }));
      
      setProducts(formattedProducts);
    } catch (err: any) {
      setError(err.message);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = (productsToExport: Product[]) => {
    try {
      const headers = [
        'Handle',
        'Title',
        'Body (HTML)',
        'Vendor',
        'Type',
        'Tags',
        'Published',
        'Option1 Name',
        'Option1 Value',
        'Variant Price',
        'Variant Requires Shipping',
        'Variant Taxable',
        'Image Src',
        'Status'
      ].join(',');

      const csvRows = productsToExport.map(product => {
        const handle = product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return [
          handle,
          product.title,
          '',
          'EasySync',
          'Default',
          '',
          'true',
          'Title',
          'Default',
          product.price.toFixed(2),
          'true',
          'true',
          product.image || '',
          'active'
        ].map(field => {
          if (typeof field === 'string' && field.includes(',')) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        }).join(',');
      });

      const csvContent = [headers, ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'shopify_products.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(current => 
      current.includes(productId) 
        ? current.filter(id => id !== productId)
        : [...current, productId]
    );
  };

  const handleClearSelection = () => {
    setSelectedProducts([]);
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#EAEAEA] pb-20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold mb-6 bg-clip-text text-transparent text-white"
        >
          EasySync
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-gray-400 mb-12"
        >
          Import Shopify products seamlessly. Start by entering your store URL.
        </motion.p>

        {/* Search Input */}
        <div className="max-w-2xl mx-auto">
          <div className="relative flex items-center">
            <Input
              type="text"
              placeholder="Enter your Shopify store URL..."
              value={shopUrl}
              onChange={(e) => setShopUrl(e.target.value)}
              className="w-full bg-[#1A1A1A] border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-lg py-6 pr-12"
            />
            <Button
              onClick={handleSearch}
              className="absolute right-2 bg-blue-500 hover:bg-blue-600 transition-colors duration-300"
              size="icon"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Search />}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="container mx-auto px-4 mt-4">
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* Products Grid */}
      {products.length > 0 && (
        <div className="container mx-auto px-4">
          {/* Show main actions only when no selection */}
          {selectedProducts.length === 0 && (
            <div className="flex justify-end gap-4 mb-8">
              <Button
                onClick={() => handleExportCSV(products)}
                variant="outline"
                className="bg-[#1A1A1A] border-gray-700 hover:bg-gray-800 text-gray-200"
              >
                <Download className="mr-2 h-4 w-4" />
                Export All
              </Button>
              <ShopSyncDialog products={products} buttonLabel="Sync All" />
            </div>
          )}

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {products.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
                onClick={() => toggleProduct(product.id)}
              >
                <Card 
                  className={`overflow-hidden bg-[#1A1A1A] border-gray-700 hover:shadow-lg transition-all duration-300 cursor-pointer relative ${
                    selectedProducts.includes(product.id) ? 'border-emerald-500 shadow-emerald-500/20' : 'hover:shadow-blue-500/10'
                  }`}
                >
                  <div className="absolute top-2 right-2 z-10">
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                    />
                  </div>
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">{product.title}</h3>
                    <p className="text-emerald-400 font-medium">${product.price.toFixed(2)}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Selection Action Bar */}
          <AnimatePresence>
            {selectedProducts.length > 0 && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-0 left-0 right-0 bg-[#1A1A1A] border-t border-gray-700 p-4 z-50"
              >
                <div className="container mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSelection}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear selection ({selectedProducts.length})
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => handleExportCSV(products.filter(p => selectedProducts.includes(p.id)))}
                      className="bg-[#1A1A1A] border-gray-700 hover:bg-gray-800 text-gray-200"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export Selected
                    </Button>
                    
                    <ShopSyncDialog 
                      products={products.filter(p => selectedProducts.includes(p.id))}
                      buttonLabel="Sync Selected"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}