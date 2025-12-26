import userApi from "./httpClient";

export type Ticket0ResolutionCopyResponse = {
  readonly title: string;
  readonly body: string;
  readonly primary_cta_label: string;
  readonly secondary_cta_label: string;
};

export const getTicket0ResolutionCopy = async (): Promise<Ticket0ResolutionCopyResponse> => {
  const response = await userApi.get<Ticket0ResolutionCopyResponse>("/api/ui-copy/ticket0");
  return response.data;
};
