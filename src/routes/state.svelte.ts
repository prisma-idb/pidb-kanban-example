type GlobalState = {
	selectedBoard: string | undefined;
};

export const globalState: GlobalState = $state({
	selectedBoard: undefined
});
