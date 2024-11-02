import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import Searchbar from "@/components/shared/Searchbar";
import Pagination from "@/components/shared/Pagination";
import CommunityCard from "@/components/cards/CommunityCard";

import { fetchUser } from "@/lib/actions/user.actions";
import { fetchCommunities } from "@/lib/actions/community.actions";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>; // Handle `searchParams` as a Promise
}

async function Page({ searchParams: rawSearchParams }: PageProps) {
  // Await searchParams for Next.js 15 compatibility
  const resolvedSearchParams = await rawSearchParams;
  const pageNumber = resolvedSearchParams.page ? +resolvedSearchParams.page : 1;
  
  const user = await currentUser();
  if (!user) return null;

  const userInfo = await fetchUser(user.id);
  if (!userInfo?.onboarded) {
    redirect("/onboarding");
  }

  const result = await fetchCommunities({
    searchString: resolvedSearchParams.q ?? "",
    pageNumber,
    pageSize: 25,
  });

  return (
    <>
      <h1 className="head-text">Communities</h1>

      <div className="mt-5">
        <Searchbar routeType="communities" />
      </div>

      <section className="mt-9 flex flex-wrap gap-4">
        {result.communities.length === 0 ? (
          <p className="no-result">No Result</p>
        ) : (
          result.communities.map((community) => (
            <CommunityCard
              key={community.id}
              id={community.id}
              name={community.name}
              username={community.username}
              imgUrl={community.image}
              bio={community.bio}
              members={community.members}
            />
          ))
        )}
      </section>

      <Pagination
        path="communities"
        pageNumber={pageNumber}
        isNext={result.isNext}
      />
    </>
  );
}

export default Page;
