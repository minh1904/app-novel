import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Spinner,
} from './components/ui';

export function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">Design System</h1>
            <p className="text-sm text-muted-foreground">
              Component preview — migrate-design-system
            </p>
          </div>

          {/* Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>Các variants của Button component</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
              <Button disabled>Disabled</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </CardContent>
          </Card>

          {/* Input */}
          <Card>
            <CardHeader>
              <CardTitle>Input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="Nhập văn bản..." />
              <Input placeholder="Disabled" disabled />
            </CardContent>
          </Card>

          {/* Counter + Spinner */}
          <Card>
            <CardHeader>
              <CardTitle>Counter & Spinner</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Button onClick={() => setCount((c) => c - 1)} variant="outline" size="sm">
                −
              </Button>
              <span className="text-foreground font-mono text-lg w-8 text-center">{count}</span>
              <Button onClick={() => setCount((c) => c + 1)} size="sm">
                +
              </Button>
              <Spinner className="ml-auto text-muted-foreground" />
            </CardContent>
          </Card>

          {/* Dialog */}
          <Card>
            <CardHeader>
              <CardTitle>Dialog</CardTitle>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger render={<Button variant="outline" />}>Mở Dialog</DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Design System hoạt động!</DialogTitle>
                    <DialogDescription>
                      Tất cả components đã được migrate thành công từ D:\contexta.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end">
                    <Button size="sm">OK</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
