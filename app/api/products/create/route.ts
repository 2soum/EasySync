// app/api/products/create/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function downloadImage(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return base64;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

async function createProduct(product: any, shopUrl: string, accessToken: string) {
  const cleanShopUrl = shopUrl
    .toLowerCase()
    .replace(/^https?:\/\//, '')  
    .replace(/\/$/, '');          

  if (!cleanShopUrl.endsWith('myshopify.com')) {
    throw new Error('Shop URL must end with myshopify.com');
  }

  // First create the product
  const productMutation = `
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
  `;

  try {
    // Create product first
    const productResponse = await fetch(`https://${cleanShopUrl}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: productMutation,
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
      })
    });

    const contentType = productResponse.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid shop URL or access token');
    }

    const productResult = await productResponse.json();

    if (productResult.errors) {
      throw new Error(JSON.stringify(productResult.errors));
    }

    if (productResult.data?.productCreate?.userErrors?.length > 0) {
      throw new Error(JSON.stringify(productResult.data.productCreate.userErrors));
    }

    const createdProduct = productResult.data.productCreate.product;

    // If there's an image, download and attach it using REST API instead
    if (product.image) {
      try {
        const imageData = await downloadImage(product.image);
        
        // Use REST API to attach image
        const imageResponse = await fetch(`https://${cleanShopUrl}/admin/api/2024-01/products/${createdProduct.id.split('/').pop()}/images.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: {
              attachment: imageData,
              filename: `${product.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`
            }
          })
        });

        if (!imageResponse.ok) {
          console.error('Failed to attach image:', await imageResponse.text());
        }
      } catch (err) {
        console.error('Error attaching image:', err);
        // Continue even if image upload fails
      }
    }

    return createdProduct;

  } catch (error) {
    console.error('Error in createProduct:', error);
    throw error;
  }
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

    const createdProducts = [];
    for (const product of products) {
      const createdProduct = await createProduct(product, shopUrl, accessToken);
      createdProducts.push(createdProduct);
    }

    return NextResponse.json({
      success: true,
      message: `${products.length} products synced successfully`,
      products: createdProducts
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