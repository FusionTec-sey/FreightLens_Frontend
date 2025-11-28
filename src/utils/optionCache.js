import axios from "axios";

const cache = {};

export async function getOption(path) {
  if (cache[path]) {
    return cache[path];
  }

  try {
    const response = await axios.get(
      `${process.env.REACT_APP_NETWORK}/${path}`, 
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "skip_zrok_interstitial": "true",
        },
        withCredentials: false
      }
    );

    let data = response.data;
    if (typeof data === "string") {
      data = JSON.parse(data);
    }

    const options = data.data.map(([id, name]) => ({ id, name }));

    cache[path] = options; // Cache the result

    return options;
  } catch (error) {
    console.error(`Failed to fetch ${path}:`, error);
    return [];
  }
}

export async function getAllOptions() {
  const paths = {
    suppliers: "supplierDetails",
    consignees: "consignee",
    emptyLocations: "unloadVenue",
    status: "status",
    type: "containerType",
    shipping: "shippingDocument",
    vessal: "vessal",
    logistics: "logisticsProvider",
    material: "material"
  };

  // Promise.all to fetch all simultaneously
  const results = await Promise.all(
    Object.values(paths).map(path => getOption(path))
  );

  return Object.keys(paths).reduce((acc, key, idx) => {
    acc[key] = results[idx];
    return acc;
  }, {});
}
