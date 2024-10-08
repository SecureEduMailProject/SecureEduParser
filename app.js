const express = require('express');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const { htmlToText } = require('html-to-text');

const app = express();
const port = 3001;

app.get('/get-releases', async (req, res) => {
  try {
    // Define Atom feed URLs for the three repositories
    const feedUrls = [
      'https://github.com/secureedumailproject/secureedumail/releases.atom',
      'https://github.com/secureedumailproject/secureedurest/releases.atom',
      'https://github.com/secureedumailproject/secureeducrypt/releases.atom'
    ];

    // Fetch all Atom feeds concurrently
    const responses = await Promise.all(feedUrls.map(url => axios.get(url)));

    // Parse XML responses to JSON
    const parser = new XMLParser();
    const allEntries = responses.flatMap((response, index) => {
      const result = parser.parse(response.data);

      // Ensure result has the expected structure
      if (!result.feed || !result.feed.entry) {
        throw new Error(`Unexpected XML structure for feed at index ${index}`);
      }

      // Ensure entries is always an array (handles both single and multiple entries)
      const entriesData = Array.isArray(result.feed.entry) ? result.feed.entry : [result.feed.entry];

      // Extract relevant data from each entry
      return entriesData.map((entry) => {
        // Convert HTML content to text
        const contentText = htmlToText(entry.content || '', {
          wordwrap: 130
        });

        // Extract specific data from contentText using regex
        const idMatch = contentText.match(/ID:\s*(\d+)/);
        const dateMatch = contentText.match(/Date:\s*([\d-]+)/);
        const versionMatch = contentText.match(/Version:\s*([\w.]+)/);
        const tagMatch = contentText.match(/Tag:\s*(\w+)/);
        const nameMatch = contentText.match(/Name:\s*'([^']+)'/);
        const typeMatch = contentText.match(/Type:\s*'([^']+)'/);  
        const downloadLinkMatch = contentText.match(/Download Link:\s*'(https:\/\/[^']+)'/);
        const githubLinkMatch = contentText.match(/GitHub\n\[(https:\/\/[^]]+)\]/);

        return {
          id: idMatch ? parseInt(idMatch[1], 10) : -1,  
          date: dateMatch ? dateMatch[1] : 'Unknown',
          version: versionMatch ? versionMatch[1] : 'Unknown',
          tag: tagMatch ? tagMatch[1] : 'Unknown',
          name: nameMatch ? nameMatch[1] : 'Unknown',
          type: typeMatch ? typeMatch[1] : 'Unknown',  
          downloadLink: downloadLinkMatch ? downloadLinkMatch[1] : 'No link found',
          githubLink: githubLinkMatch ? githubLinkMatch[1] : 'No link found',
        };
      });
    });

    // Sort the entries by ID (from highest to lowest)
    const sortedEntries = allEntries.sort((a, b) => b.id - a.id);  

    res.status(200).json({ entries: sortedEntries });
  } catch (error) {
    console.error('Error:', error);

    res.status(500).json({
      err: true,
      msg: "Failed to fetch or parse one or more Atom feeds",
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}/get-releases`);
});
