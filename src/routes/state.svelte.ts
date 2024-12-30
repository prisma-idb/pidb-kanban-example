type GlobalState = {
	boardToAddTaskTo: string | undefined;
	boardToEdit: string | undefined;
	taskToEdit: number | undefined;
};

export const globalState: GlobalState = $state({
	boardToAddTaskTo: undefined,
	boardToEdit: undefined,
	taskToEdit: undefined
});
