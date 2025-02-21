import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { ShopSyncDialog } from './ShopSyncDialog';

interface SelectionActionBarProps {
  selectedProducts: string[];
  products: any[];
  onClearSelection: () => void;
  onExportSelected: () => void;
}

export function SelectionActionBar({
  selectedProducts,
  products,
  onClearSelection,
  onExportSelected
}: SelectionActionBarProps) {
  if (selectedProducts.length === 0) return null;

  return (
    <AnimatePresence>
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
              onClick={onClearSelection}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4 mr-2" />
              Clear selection ({selectedProducts.length})
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={onExportSelected}
              className="bg-[#1A1A1A] border-gray-700 hover:bg-gray-800 text-gray-200"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Selected
            </Button>
            
            <ShopSyncDialog 
              products={products.filter(p => selectedProducts.includes(p.id))}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}