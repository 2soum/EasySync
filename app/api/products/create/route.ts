// app/api/products/create/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const BATCH_SIZE = 10; // Increased batch size
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Utility to handle retries with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => 
        setTimeout(resolve, RETRY_DELAY * (MAX_RETRIES - retries + 1))
      );
      return withRetry(operation, retries - 1);
    }
    throw error;
  }
}

// Parallel image download with retry
async function downloadImage(imageUrl: string): Promise<string | null> {
  try {
    return await withRetry(async () => {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Failed to download image: ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer).toString('base64');
    });
  } catch (error) {
    console.error(`Failed to download image from ${imageUrl}:`, error);
    return null; // Continue without image rather than failing
  }
}

async function createBatchOfProducts(
  products: any[],
  shopUrl: string,
  accessToken: string
) {
  const cleanShopUrl = shopUrl
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');

  if (!cleanShopUrl.endsWith('myshopify.com')) {
    throw new Error('Shop URL must end with myshopify.com');
  }

  // Pre-download all images in parallel
  const imageDownloads = products
    .filter(p => p.image)
    .map(async p => ({
      productTitle: p.title,
      base64: await downloadImage(p.image)
    }));
  
  const downloadedImages = await Promise.all(imageDownloads);
  const imageMap = new Map(
    downloadedImages
      .filter(img => img.base64)
      .map(img => [img.productTitle, img.base64])
  );

  // Prepare all product mutations
  const productMutations = products.map(product => ({
    query: `
      mutation productCreate($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            variants(first: 1) {
              edges {
                node {
                  id
                  price
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    variables: {
      input: {
        title: product.title,
        descriptionHtml: product.description || "",
        variants: [{
          price: product.price,
          inventoryManagement: "SHOPIFY",
          inventoryPolicy: "CONTINUE",
          requiresShipping: true,
          taxable: true
        }],
        status: "ACTIVE",
        published: true
      }
    }
  }));

  // Execute product creation in parallel with rate limiting
  const createdProducts = await Promise.all(
    productMutations.map(async (mutation, index) => {
      // Add small delay between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, index * 100));

      try {
        const response = await withRetry(async () => {
          const res = await fetch(
            `https://${cleanShopUrl}/admin/api/2024-01/graphql.json`,
            {
              method: 'POST',
              headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(mutation)
            }
          );

          const contentType = res.headers.get('content-type');
          if (!contentType?.includes('application/json')) {
            throw new Error('Invalid shop URL or access token');
          }

          return res;
        });

        const result = await response.json();

        if (result.errors || result.data?.productCreate?.userErrors?.length > 0) {
          throw new Error(JSON.stringify(result.errors || result.data.productCreate.userErrors));
        }

        const createdProduct = result.data.productCreate.product;
        const productTitle = products[index].title;
        const imageData = imageMap.get(productTitle);

        // Attach image if available
        if (imageData) {
          await withRetry(async () => {
            const imageResponse = await fetch(
              `https://${cleanShopUrl}/admin/api/2024-01/products/${createdProduct.id.split('/').pop()}/images.json`,
              {
                method: 'POST',
                headers: {
                  'X-Shopify-Access-Token': accessToken,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  image: {
                    attachment: imageData,
                    filename: `${productTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`
                  }
                })
              }
            );

            if (!imageResponse.ok) {
              throw new Error(await imageResponse.text());
            }
          });
        }

        return createdProduct;
      } catch (error) {
        console.error(`Error creating product ${products[index].title}:`, error);
        throw error;
      }
    })
  );

  return createdProducts;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shopUrl, accessToken, products } = body;

    if (!shopUrl || !accessToken || !products) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const allCreatedProducts = [];
    
    // Process products in larger batches
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i/BATCH_SIZE + 1} of ${Math.ceil(products.length/BATCH_SIZE)}`);
      
      const batchResults = await createBatchOfProducts(batch, shopUrl, accessToken);
      allCreatedProducts.push(...batchResults);
    }

    return NextResponse.json({
      success: true,
      message: `${allCreatedProducts.length} products synced successfully`,
      products: allCreatedProducts
    });

  } catch (error: any) {
    console.error('Error syncing products:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Unknown error occurred while syncing products'
      },
      { status: 500 }
    );
  }
}