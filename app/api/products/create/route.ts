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

  try {
    // Create product with GraphQL
    const productResult = await createProductBase(product, cleanShopUrl, accessToken);
    
    // If there's an image, process it separately with increased timeout
    if (product.image) {
      try {
        await attachProductImage(product, productResult.id, cleanShopUrl, accessToken);
      } catch (err) {
        console.error('Error attaching image:', err);
        // Continue even if image upload fails
      }
    }

    return productResult;
  } catch (error) {
    console.error('Error in createProduct:', error);
    throw error;
  }
}

async function createProductBase(product: any, cleanShopUrl: string, accessToken: string) {
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

  const response = await fetch(`https://${cleanShopUrl}/admin/api/2024-01/graphql.json`, {
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

  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid shop URL or access token');
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(JSON.stringify(result.errors));
  }

  if (result.data?.productCreate?.userErrors?.length > 0) {
    throw new Error(JSON.stringify(result.data.productCreate.userErrors));
  }

  return result.data.productCreate.product;
}

async function attachProductImage(product: any, productId: string, cleanShopUrl: string, accessToken: string) {
  const imageData = await downloadImage(product.image);
  
  const imageResponse = await fetch(
    `https://${cleanShopUrl}/admin/api/2024-01/products/${productId.split('/').pop()}/images.json`,
    {
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
    }
  );

  if (!imageResponse.ok) {
    throw new Error(await imageResponse.text());
  }

  return imageResponse.json();
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

    // Since we're now processing one product at a time from the frontend,
    // we expect only one product in the array
    const product = products[0];
    const createdProduct = await createProduct(product, shopUrl, accessToken);

    return NextResponse.json({
      success: true,
      message: 'Product synced successfully',
      product: createdProduct
    });

  } catch (error: any) {
    console.error('Error syncing product:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Unknown error occurred while syncing product'
      },
      { status: 500 }
    );
  }
}