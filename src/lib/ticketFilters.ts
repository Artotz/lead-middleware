import { SortOrder } from "./filters";
import { TicketStatus } from "./domain";

export type TicketFiltersState = {
  search: string;
  status: TicketStatus | "";
  sort: SortOrder;
};

export const INITIAL_TICKET_FILTERS: TicketFiltersState = {
  search: "",
  status: "",
  sort: "recentes",
};
