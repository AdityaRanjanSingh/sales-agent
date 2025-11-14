import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const BrochureRetrieverInputSchema = z.object({
  brochureName: z.string().describe("The name or type of brochure to retrieve (e.g., 'product-catalog', 'pricing-sheet', 'company-overview')"),
});

export class BrochureRetrieverTool extends DynamicStructuredTool {
  constructor() {
    super({
      name: "retrieve_brochure",
      description: "Retrieves a brochure file from storage. Use this when a customer requests marketing materials, product information, catalogs, or brochures. Returns the file's public URL and metadata that can be used to attach to an email.",
      schema: BrochureRetrieverInputSchema,
      func: async ({ brochureName }) => {
        try {
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_PRIVATE_KEY;

          if (!supabaseUrl || !supabaseKey) {
            return JSON.stringify({
              success: false,
              error: "Supabase credentials not configured",
            });
          }

          const supabase = createClient(supabaseUrl, supabaseKey);

          // List files in the brochures bucket to find matching brochure
          const { data: files, error: listError } = await supabase
            .storage
            .from("brochures")
            .list("", {
              limit: 100,
              offset: 0,
            });

          if (listError) {
            return JSON.stringify({
              success: false,
              error: `Failed to list brochures: ${listError.message}`,
            });
          }

          if (!files || files.length === 0) {
            return JSON.stringify({
              success: false,
              error: "No brochures found in storage",
              availableBrochures: [],
            });
          }

          // Find matching brochure (case-insensitive partial match)
          const matchingFile = files.find((file) =>
            file.name.toLowerCase().includes(brochureName.toLowerCase()) ||
            brochureName.toLowerCase().includes(file.name.toLowerCase().replace(/\.[^/.]+$/, ""))
          );

          if (!matchingFile) {
            const availableNames = files.map((f) => f.name).join(", ");
            return JSON.stringify({
              success: false,
              error: `Brochure '${brochureName}' not found`,
              availableBrochures: files.map((f) => f.name),
              suggestion: `Available brochures: ${availableNames}`,
            });
          }

          // Get public URL for the brochure
          const { data: urlData } = supabase
            .storage
            .from("brochures")
            .getPublicUrl(matchingFile.name);

          return JSON.stringify({
            success: true,
            brochure: {
              name: matchingFile.name,
              publicUrl: urlData.publicUrl,
              size: matchingFile.metadata?.size,
              lastModified: matchingFile.updated_at,
              mimeType: matchingFile.metadata?.mimetype,
            },
            message: `Successfully retrieved brochure: ${matchingFile.name}. You can use the publicUrl to attach this file to an email.`,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: `Error retrieving brochure: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      },
    });
  }
}
