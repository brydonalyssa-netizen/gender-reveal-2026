import { getStore } from "@netlify/blobs";

const REVEAL_DATE = new Date("2026-10-07T03:00:00Z");

export default async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  try {
    const store = getStore("gender-reveal-votes");

    if (req.method === "GET") {
      const { blobs } = await store.list();
      const votes = [];

      for (const blob of blobs) {
        const vote = await store.get(blob.key, {
          type: "json",
          consistency: "strong"
        });

        if (vote) {
          votes.push(vote);
        }
      }

      votes.sort((a, b) => a.createdAt - b.createdAt);

      return new Response(JSON.stringify(votes), {
        status: 200,
        headers
      });
    }

    if (req.method === "POST") {
      if (new Date() >= REVEAL_DATE) {
        return new Response(
          JSON.stringify({ error: "Voting is closed." }),
          { status: 403, headers }
        );
      }

      const body = await req.json();
      const name = String(body.name || "").trim().slice(0, 50);
      const guess = String(body.guess || "").trim();

      if (!name || !["Girl", "Boy"].includes(guess)) {
        return new Response(
          JSON.stringify({ error: "Please enter your name and choose Girl or Boy." }),
          { status: 400, headers }
        );
      }

      const vote = {
        name,
        guess,
        createdAt: Date.now()
      };

      const key = `${Date.now()}-${crypto.randomUUID()}`;

      await store.setJSON(key, vote);

      return new Response(JSON.stringify(vote), {
        status: 201,
        headers
      });
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed." }),
      { status: 405, headers }
    );

  } catch (error) {
    console.error("Vote function error:", error);

    return new Response(
      JSON.stringify({
        error: "Could not load or save guesses right now."
      }),
      { status: 500, headers }
    );
  }
};
