export const dynamic = "force-static";

export async function GET() {
  return Response.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appIDs: ["TEAMID.Manna.scrolls"],
            components: [
              { "/": "/user/*", comment: "Scrolls profile links" },
              { "/": "/scroll/*", comment: "Scrolls post links" },
            ],
          },
        ],
      },
    },
    {
      headers: {
        "content-type": "application/json",
      },
    },
  );
}
