import { CreateRow } from "@/screens/rows/create/CreateRow";

interface Props {
  params: {
    key: string;
  };
}

export default function EditRowPage({ params }: Props) {
  return <CreateRow rowKey={params.key} isEditMode={true} />;
} 