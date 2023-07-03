import express, { response } from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'wishlists',
});
app.get('/', (req, res) => {
    res.send('Hello, World!');
  });
  
  app.post('/api/wishlist', async (req, res) => {
    const { productId, cid } = req.body; // Destructure product and cid from the request body
    const cids = parseInt(cid);
    const accessToken = "shpua_5f5b9cada0b62ffed51ed7b081989bed";
    const product = await fetch(`https://abrardemostore.myshopify.com/admin/api/2023-04/products/${productId}.json`,{
        headers: {
          "X-Shopify-Access-Token": accessToken,
        }
    })
    .then((response) => response.json())
    .then((data) => {
        // Handle the product details
        console.log("Product Detail:", data.product);
      return data.product;
    })
    console.log('product:', product);
    // const wishlist_count = product.length
    // console.log('product count:',wishlist_count);
    // const wishlistData = JSON.stringify(product); // Convert product array to JSON string
  
    const checkQuery = 'SELECT * FROM wishlist_table WHERE customer_id = ?';
    connection.query(checkQuery, [cids], (error, results) => {
      if (error) {
        console.log('Error checking wishlist items:', error);
        res.sendStatus(500); // Send an error response
      } else {
        const items = JSON.parse(results[0].wishlist_items);
        // console.log('ITEMSSS',items);
        const ids = items.some(obj=>obj.id === product.id)
        if (results.length > 0 && !(ids)) {
            
            // Wishlist items exist for the given cids, perform update
            items.push(product);
            const strproductId = JSON.stringify(items);
            // console.log(strproductId)
          const updateQuery = 'UPDATE wishlist_table SET wishlist_items = ?,wishlist_count = ? WHERE customer_id = ?';
          connection.query(updateQuery, [strproductId,items.length, cids], (error, results) => {
            if (error) {
                console.error('Error updating wishlist items:', error);
                res.status(400).send("Failed to insert"); // Send a success response
            } else {
                console.log('Wishlist items updated successfully');
                res.status(200).json({product:product}); // Send an error response
            }
          });
        } else {
            const items = [];
          items.push(product);
          const strproductId = JSON.stringify(items);
          const insertQuery = 'INSERT INTO wishlist_table (customer_id,wishlist_items,wishlist_count) VALUES (?, ?, ?)';
          connection.query(insertQuery, [cids, strproductId,items.length], (error, results) => {
            if (error) {
              console.error('Error inserting wishlist items:', error);
              res.sendStatus(500); // Send an error response
            } else {
              console.log('Wishlist items stored in the database successfully');
              res.sendStatus(200); // Send a success response
            }
          });
        }
      }
    });
  });
  app.get('/api/getWishlist', (req, res) => {
    // Query the wishlist items from the database
    connection.query('SELECT wishlist_items FROM wishlist_table', (error, results) => {
      if (error) {
        console.error('Error retrieving wishlist items:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        // Return the wishlist items in the response
        // console.log('response',res.json(results));
        // console.log(JSON.stringify(results))
        res.json(results);
      }
    });
  });
  app.post('/exclude-product-ids', (req, res) => {
    const productIDs = req.body.productIDs; // Assuming the product IDs are sent in the request body as an array
    console.log(productIDs)
    const sql = 'INSERT INTO advanced_settings (products_to_exclude) VALUES (?)' ;
  
    connection.query(sql, [JSON.stringify(productIDs)], (error, results) => {
      if (error) {
        console.error('Error inserting product IDs:', error);
        res.status(500).json({ error: 'Failed to insert product IDs' });
      } else {
        console.log('Product IDs inserted successfully');
        res.json({ message: 'Product IDs inserted successfully' });
      }
    });
  });
  app.get('/get-excluded-product-ids', (req, res) => {
    // Fetch the excluded product IDs from the MySQL database
    // Example code using MySQL library
    connection.query('SELECT products_to_exclude FROM advanced_settings', (error, results) => {
      if (error) {
        console.error('Error fetching excluded product IDs:', error);
        res.status(500).json({ error: 'Failed to fetch excluded product IDs' });
      } else {
        const excludedProductIds = results.map((row) => row.products_to_exclude);
        res.json({ productIDs: excludedProductIds });
      }
    });
  });
  app.post('/api/deletewishlistItems', (req, res) => {
    // Fetch the excluded product IDs from the MySQL database
    // Example code using MySQL library
    const {productId,cid} = req.body;
    connection.query(`SELECT wishlist_items FROM wishlist_table WHERE customer_id=${cid}`, (error, results) => {
      if (error) {
        console.error('Error fetching excluded product IDs:', error);
        res.status(500).json({ error: 'Failed to fetch excluded product IDs' });
      } else {
        // console.log('ITEMS',JSON.parse(results[0].wishlist_items))
        const items = JSON.parse(results[0].wishlist_items);
        const ids = items.filter(obj=>obj.id != productId)
        console.log(productId)
        console.log(items.length)
        console.log(ids.length)
        const strproductIds = JSON.stringify(ids);
        const updateQuery = 'UPDATE wishlist_table SET wishlist_items = ?,wishlist_count = ? WHERE customer_id = ?';
        connection.query(updateQuery, [strproductIds,ids.length, cid], (error, results) => {
          if (error) {
            console.error('Error deleting wishlist items:', error);
            res.status(400).send({error:"Failed to insert"}); // Send a success response
        } else {
            console.log('Wishlist items deleted successfully');
            res.status(200).send({data:"Data Posted"}); // Send an error response
          }
        });
      }
    });
  });
  app.get('/api/createTemplate',async (req,res)=>{
     console.log('themess')
    const accessToken = "shpua_5f5b9cada0b62ffed51ed7b081989bed";
    await fetch("https://abrardemostore.myshopify.com/admin/api/2023-04/themes.json" ,{
        headers: {
          "X-Shopify-Access-Token": accessToken,
        }
    })
    .then((response) => response.json())
    .then( async (data) => {
        // Find the ID of the theme with role "main"
        const themes = data.themes;
        const mainTheme = themes.find((theme) => theme.role === "main");
        let themeId = mainTheme.id;
        // console.log(response)
        console.log(themeId)
      if(themeId){
          try {
            const createResponse = await fetch(
              `https://abrardemostore.myshopify.com/admin/api/2023-01/themes/${themeId}/assets.json`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  "X-Shopify-Access-Token": accessToken,
                },
                body: JSON.stringify({
                  asset: {
                    key: "templates/page.wishlist-template.liquid",
                    value: `
                   
                    <div id="page">
                      <h1>Wishlist Items</h1>
                      <input type="checkbox" class="select-all" id="select-all-checkbox" onchange="toggleAllCheckboxes()" />
                      <label for="select-all-checkbox">Select All</label>
                      <button class="multiSelect" onclick="moveToCart()">Move to Cart</button>
                        <button class="multiSelect" onclick="removeSelectedProducts()">Remove</button>
                      <div id="productContainer" style="display:flex"></div>
                    </div>
                      `,
                  },
                }),
              }
            );
            // console.log(createResponse.body)
            if (createResponse.ok) {
              console.log("Template created successfully");
              res.status(200).json({themetemplatecreated:true})
            }
          } catch (error) {
            console.error("Error creating template:", error);
            res.status(400).json({error:error})
          }
      }else{
        console.log('theme not found')
      }
    })
    .catch((error) => {
      console.error("Error fetching themes:", error);
      res.status(400).json({error:error});
    });
  })
  app.get('/api/createPage',async (req,res) =>{
    console.log('CREATING PAGE......')
    const accessToken = "shpua_5f5b9cada0b62ffed51ed7b081989bed"; // Replace with your access token
    const pageHandle = "wishlist"; // Replace with the handle of the wishes page
  
    try {
      // Check if the page already exists
      const checkResponse = await fetch(
        `https://abrardemostore.myshopify.com/admin/api/2023-04/pages.json?handle=${pageHandle}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
          },
        }
      );
  
      if (checkResponse.ok) {
        const pageData = await checkResponse.json();
        console.log(pageData)
        if (pageData.pages.length > 0) {
          console.log("Wishlist page already exists:", pageData.pages[0]);
          res.status(400).json({error:'Page already exists'});
          return; // Return early if the page already exists
        }
       else {
      // Create the page if it doesn't exist
      const createResponse = await fetch(`https://abrardemostore.myshopify.com/admin/api/2023-04/pages.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          page: {
            title: "Wishlist",
            handle: pageHandle,
            body_html: "<h1>Wishlist Items</h1>",
            published: true,
            template_suffix: "wisheslist-page",
          },
        }),
      });
  
        const pageData = await createResponse.json();
        console.log("Wishlist page created:", pageData);
        res.status(200).json({pagecreated:true});
        return;
      }
    }
    } catch (error) {
        res.status(400).json({error:'Sorry page not created'})
      console.error("Error creating wishlist page:", error);
    }

  })
  app.post('/api/deleteAll',async(req,res)=>{
    console.log(req.body)
    const {productidstoremove,cid} = req.body;
    console.log(cid)
    console.log(productidstoremove)
    let intpids = productidstoremove.map(id=>parseInt(id));
    try {
        const checkQuery = 'SELECT * FROM wishlist_table WHERE customer_id = ?';
        connection.query(checkQuery, [cid], (error, results) => {
          if (error) {
            console.log('Error checking wishlist items:', error);
            res.sendStatus(500); // Send an error response
          } else {
              // console.log('ITEMSSS',items);
              const items = JSON.parse(results[0].wishlist_items);
              console.log(items.length)
              if (results.length > 0) {
                const ids = items.filter(product => !intpids.includes(product.id))
                console.log(ids.length)
                const strproductId = JSON.stringify(ids);
                // console.log(strproductId)
              const updateQuery = 'UPDATE wishlist_table SET wishlist_items = ?,wishlist_count = ? WHERE customer_id = ?';
              connection.query(updateQuery, [strproductId,ids.length, cid], (error, results) => {
                if (error) {
                    console.error('Error updating wishlist items:', error);
                    res.status(400).send("Failed to delete"); // Send a success response
                } else {
                    console.log('Wishlist items updated successfully');
                    res.status(200).json({product:intpids}); // Send an error response
                }
              });
            }
    }
})
} catch (error) {
        console.log(error)
    }
    })
  const PORT = 3000; // Use any available port number

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
    