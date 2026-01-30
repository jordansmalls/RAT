// import Link from "../models/link.model.js"

// /**
//  * Checks if a slug is taken
//  * @param {string} slug - the currently generated slug
//  * @return {boolean} - true if available, else false
//  */
// const isAvailable = async function(slug) {
//     let taken = await Link.findOne({ slug: slug });

//     if(!taken) {
//         return true;
//     } else {
//         return false;
//     }
// }

// /**
//  * Generates a random alphanumeric slug.
//  * @param {number} length - The desired length of the slug (default is 4).
//  * @returns {string} - A random unique-looking string.
//  */
// export const generateSlug = (length = 4) => {

//     const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
//     let slug = "";

//     for (let i = 0; i < length; i++) {
//         const randomIndex = Math.floor(Math.random() * characters.length);
//         slug += characters.charAt(randomIndex);
//     }

//     return slug;
// };

import Link from "../models/link.model.js";

/**
 * Checks if a slug is taken
 * @param {string} slug - the currently generated slug
 * @return {boolean} - true if available, else false
 */
const isAvailable = async (slug) => {
    const taken = await Link.findOne({ slug });
    return !taken;
};

/**
 * Generates a unique random alphanumeric slug.
 * @param {number} length - The desired length of the slug (default is 4).
 * @returns {Promise<string>} - A unique random string.
 */
export const generateSlug = async (length = 4) => {
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    let slug = "";
    let exists = true;

    // keep generating until isAvailable returns true
    while (exists) {
        slug = "";
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            slug += characters.charAt(randomIndex);
        }

        const available = await isAvailable(slug);
        if (available) {
            exists = false;
        }
    }

    return slug;
};
