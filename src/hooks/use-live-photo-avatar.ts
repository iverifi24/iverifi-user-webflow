import { useGetLivePhotoImageQuery, useGetLivePhotoStatusQuery } from "@/redux/api";

/** The person's live photo as an image source for avatars, or undefined (no photo yet, expired, or the photo is PIN-locked). */
export function useLivePhotoAvatar(): string | undefined {
  const { data: status } = useGetLivePhotoStatusQuery();
  const has = !!status?.data?.has_live_photo;
  const { data: image } = useGetLivePhotoImageQuery(undefined, { skip: !has });
  return has ? image?.data?.image : undefined;
}
