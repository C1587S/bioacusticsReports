const silhouetteCache = new Map();

export async function getSpeciesSilhouette(speciesName) {
    try {
        speciesName = speciesName.toLowerCase();
        // Check cache first
        if (silhouetteCache.has(speciesName)) {
            return silhouetteCache.get(speciesName);
        }

        const encodedSpeciesName = encodeURIComponent(speciesName);
        const apiURL = `https://api.gbif.org/v1/species/suggest?limit=1&q=${encodedSpeciesName}`;
        const response = await fetch(apiURL);
        const json = await response.json();

        const keys = ['speciesKey', 'genusKey', 'familyKey', 'orderKey', 'classKey', 'phylumKey', 'kingdomKey'];
        const objectIDs = keys.filter(key => key in json[0]).map(key => json[0][key]).join(',');

        const nodeApiURL = `https://api.phylopic.org/resolve/gbif.org/species?build=304&objectIDs=${objectIDs}`;
        const nodeResponse = await fetch(nodeApiURL);
        const nodeResponseJson = await nodeResponse.json();
        const speciesUuidGbif = nodeResponseJson.uuid;

        if (!speciesUuidGbif) {
            throw new Error("UUID not found for the given species.");
        }

        const imageUrl = `https://api.phylopic.org/nodes/${speciesUuidGbif}?embed_primaryImage=true`;
        const imageResponse = await fetch(imageUrl);
        const imageResponseJson = await imageResponse.json();

        const primaryImage = imageResponseJson._embedded?.primaryImage;
        if (!primaryImage || !primaryImage._links || !primaryImage._links.rasterFiles) {
            throw new Error("Silhouette image not found.");
        }

        const silhouetteUrl = primaryImage._links.rasterFiles[1].href;

        // Add to cache
        silhouetteCache.set(speciesName, silhouetteUrl);
        return silhouetteUrl;
    } catch (error) {
        console.error('Error fetching species silhouette:', error);
        return null;
    }
}


export function changeSilhouetteColor(imageUrl, targetColor, replacementColor) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                if (data[i] === targetColor.r && data[i + 1] === targetColor.g && data[i + 2] === targetColor.b) {
                    data[i] = replacementColor.r;
                    data[i + 1] = replacementColor.g;
                    data[i + 2] = replacementColor.b;
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL());
        };
        img.onerror = reject;
        img.src = imageUrl;
        console.log(imageUrl)
    });
}